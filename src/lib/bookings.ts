import "server-only";
import { randomInt } from "node:crypto";
import type { Booking, QueueDay, Service, Staff, User, Vendor } from "@prisma/client";
import { db } from "./db";
import { notifyCustomer, sendSms } from "./notify";
import { refund } from "./payfast";
import { bookingFee } from "./fees";
import { getSettings } from "./settings";
import { vendorListed } from "./plan-billing";
import { DOC_KEEP_DAYS, takesDeposits } from "./verification";
import { rand, sastAt, sastDate, sastWeekday, shortDate, time } from "./format";
import { appUrl } from "./http";
import { normalisePlate, typeInfo, type JobStage, JOB_LABEL } from "./business-types";
import { nextTicketNo, quote } from "./pricing";
import { cleanupOldData } from "./retention";
import {
  ARRIVAL_WINDOW_MINS,
  arrivalExpired,
  dailyCapacity,
  dueReminders,
  estimateStarts,
  peopleAhead,
  positionAfterMoveBack,
  refundOnCancel,
  slotsFor,
  type ChairHours,
  type QueueEntry,
} from "./queue";

export const MAX_ACTIVE_BOOKINGS = 2;
/** How far ahead customers can book a set time. */
export const BOOK_AHEAD_DAYS = 14;
export const NO_SHOW_LIMIT = 3; // within 30 days
export const BLOCK_DAYS = 7;
const UNPAID_EXPIRY_MINS = 15;

export const ACTIVE_STATUSES = ["PENDING_PAYMENT", "WAITING", "CALLED", "IN_SERVICE"] as const;
const QUEUED = ["WAITING", "CALLED", "IN_SERVICE"] as const;

export class BookingError extends Error {}

type FullBooking = Booking & { service: Service; staff: Staff | null; customer: User | null };
export type QueueView = {
  day: QueueDay;
  bookings: FullBooking[];
  etas: Map<string, Date>;
  entries: QueueEntry[];
  chairHours: Map<string, ChairHours>;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function code(len: number): string {
  return Array.from({ length: len }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export function isOpenToday(vendor: Vendor, now = new Date()): boolean {
  return vendor.openDays[sastWeekday(now)] === "1";
}

/** Does this staff member work on this day of the week? */
export function worksToday(s: Pick<Staff, "workDays">, now = new Date()): boolean {
  return (s.workDays || "1111111")[sastWeekday(now)] === "1";
}

/** Each chair's own hours today: not before the start of their shift or the end of their break, and not over lunch. */
export function chairHoursFor(staff: Staff[], now = new Date()): Map<string, ChairHours> {
  const out = new Map<string, ChairHours>();
  for (const s of staff) {
    const starts = s.startTime ? sastAt(s.startTime, now) : null;
    const back = s.breakUntil && s.breakUntil > now ? s.breakUntil : null;
    const from = starts && back ? (starts > back ? starts : back) : starts ?? back;
    const blocks: Array<[Date, Date]> = s.lunchStart && s.lunchEnd ? [[sastAt(s.lunchStart, now), sastAt(s.lunchEnd, now)]] : [];
    out.set(s.id, { from, blocks });
  }
  return out;
}

export async function todayQueue(vendorId: string): Promise<QueueDay | null> {
  return db.queueDay.findUnique({ where: { vendorId_date: { vendorId, date: sastDate() } } });
}

/** Loads a queue day with its bookings and works out everyone's estimated turn. */
export async function loadQueue(day: QueueDay, now = new Date()): Promise<QueueView> {
  const bookings = await db.booking.findMany({
    where: { queueDayId: day.id },
    include: { service: true, staff: true, customer: true },
    orderBy: { position: "asc" },
  });
  const entries: QueueEntry[] = bookings
    .filter((b) => (QUEUED as readonly string[]).includes(b.status))
    .map((b) => ({
      id: b.id,
      position: b.position,
      durationMins: b.durationMins ?? b.service.durationMins,
      staffId: b.staffId,
      status: b.status as QueueEntry["status"],
      startedAt: b.startedAt,
      calledAt: b.calledAt,
      notBefore: b.scheduledAt,
    }));
  const chairHours = chairHoursFor(await db.staff.findMany({ where: { id: { in: day.staffIds } } }), now);
  const etas = estimateStarts({
    now,
    staffIds: day.staffIds,
    entries,
    pausedUntil: day.status === "PAUSED" ? day.pausedUntil : null,
    chairHours,
  });
  return { day, bookings, etas, entries, chairHours };
}

export function aheadOf(view: QueueView, bookingId: string): number {
  return peopleAhead(view.entries, bookingId);
}

/** Bookings that count towards today's capacity. */
function countsTowardCapacity(b: Booking): boolean {
  return b.status !== "CANCELLED";
}

export async function openQueue(vendor: Vendor, staffIds: string[]): Promise<QueueDay> {
  if (vendor.status !== "APPROVED") throw new BookingError("Your business must be approved before you can open a queue.");
  if (!(await vendorListed(vendor))) throw new BookingError("Your free trial has ended. Subscribe to the monthly plan to open your queue.");
  if (!staffIds.length) throw new BookingError("Pick at least one staff member working today.");
  const services = await db.service.findMany({ where: { vendorId: vendor.id, active: true, isExtra: false } });
  if (!services.length) throw new BookingError("Add at least one service first.");
  const avg = services.reduce((s, x) => s + x.durationMins, 0) / services.length;
  const capacity = dailyCapacity(staffIds.length, vendor.openTime, vendor.closeTime, avg);
  const date = sastDate();
  return db.queueDay.upsert({
    where: { vendorId_date: { vendorId: vendor.id, date } },
    create: { vendorId: vendor.id, date, staffIds, capacity, status: "OPEN" },
    update: { staffIds, capacity, status: "OPEN", pausedUntil: null, pauseReason: null },
  });
}

export async function closeQueue(vendor: Vendor): Promise<void> {
  const day = await todayQueue(vendor.id);
  if (day) await db.queueDay.update({ where: { id: day.id }, data: { status: "CLOSED" } });
}

async function nextPosition(queueDayId: string): Promise<number> {
  const last = await db.booking.findFirst({ where: { queueDayId }, orderBy: { position: "desc" } });
  return (last?.position ?? 0) + 1;
}

async function uniqueRef(): Promise<string> {
  for (;;) {
    const ref = "Q-" + code(5);
    if (!(await db.booking.findUnique({ where: { ref } }))) return ref;
  }
}

export type BookingRequest = {
  vendorId: string;
  serviceId: string;
  staffId: string | null;
  optionLabel?: string | null;
  extraIds?: string[];
  plate?: string;
  item?: string;
  /** A later day (YYYY-MM-DD) and time (HH:MM). Without them the customer joins today's queue. */
  date?: string;
  slot?: string;
};

/** Is this business type switched on by the super admin? */
export async function typeSwitchedOn(businessType: string): Promise<boolean> {
  return !(await getSettings()).disabledTypes.includes(businessType);
}

/** Works out the price and time of a service with its option and extras, or refuses. */
async function priceVisit(vendorId: string, serviceId: string, optionLabel: string | null | undefined, extraIds: string[] = []) {
  const service = await db.service.findFirst({ where: { id: serviceId, vendorId, active: true, isExtra: false } });
  if (!service) throw new BookingError("Pick a service.");
  const extras = extraIds.length ? await db.service.findMany({ where: { id: { in: extraIds }, vendorId, active: true, isExtra: true } }) : [];
  const q = quote(service, optionLabel || null, extras);
  if (!q) throw new BookingError("Pick an option for this service.");
  return { service, q };
}

async function ticketFor(queueDayId: string, letter: string | null): Promise<string> {
  const taken = await db.booking.findMany({ where: { queueDayId }, select: { ticketNo: true } });
  return nextTicketNo(letter, taken.map((t) => t.ticketNo));
}

/** The date and time a later-day booking is for, checked against the shop's days, hours and free slots. */
async function checkSlot(vendor: Vendor, date: string, slot: string, durationMins: number, staffId: string | null) {
  const today = sastDate();
  const last = sastDate(new Date(Date.now() + BOOK_AHEAD_DAYS * 86_400_000));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= today || date > last) throw new BookingError(`Pick a day in the next ${BOOK_AHEAD_DAYS} days.`);
  const when = new Date(`${date}T${slot}:00+02:00`);
  if (!/^\d{2}:\d{2}$/.test(slot) || Number.isNaN(when.getTime())) throw new BookingError("Pick a time.");
  if (vendor.openDays[sastWeekday(when)] !== "1") throw new BookingError("The shop is closed that day.");
  const slots = await slotsOn(vendor, date, durationMins, staffId);
  if (!slots.find((s) => s.at === slot)?.free) throw new BookingError("That time has just been taken. Pick another.");
  return when;
}

/** Bookable times on a later day for a service of this length. */
export async function slotsOn(vendor: Vendor, date: string, durationMins: number, staffId: string | null = null) {
  const day = await db.queueDay.findUnique({ where: { vendorId_date: { vendorId: vendor.id, date } } });
  const booked = day
    ? await db.booking.findMany({
        where: { queueDayId: day.id, scheduledAt: { not: null }, status: { in: [...ACTIVE_STATUSES] } },
        include: { service: true },
      })
    : [];
  const weekday = sastWeekday(new Date(`${date}T12:00:00+02:00`));
  const chairs = await db.staff.count({ where: { vendorId: vendor.id, active: true } });
  const staffOn = await db.staff.findMany({ where: { vendorId: vendor.id, active: true } });
  const working = staffOn.filter((s) => (s.workDays || "1111111")[weekday] === "1").length || Math.max(1, chairs);
  return slotsFor({
    openTime: vendor.openTime,
    closeTime: vendor.closeTime,
    durationMins,
    chairs: working,
    staffId,
    booked: booked.map((b) => ({
      start: new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false }).format(b.scheduledAt!),
      durationMins: b.durationMins ?? b.service.durationMins,
      staffId: b.staffId,
    })),
  });
}

/** Customer joins today's queue, or books a set time on a later day. Deposit-free shops go straight to WAITING. */
export async function createBooking(customer: User, req: BookingRequest) {
  const { vendorId, staffId } = req;
  const now = new Date();
  if (customer.blockedUntil && customer.blockedUntil > now) {
    throw new BookingError(
      `You've missed too many bookings recently. You can book again after ${customer.blockedUntil.toLocaleDateString("en-ZA")}.`,
    );
  }
  const active = await db.booking.count({
    where: { customerId: customer.id, status: { in: [...ACTIVE_STATUSES] } },
  });
  if (active >= MAX_ACTIVE_BOOKINGS) throw new BookingError(`You can only have ${MAX_ACTIVE_BOOKINGS} bookings at a time.`);

  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || !(await vendorListed(vendor)) || !(await typeSwitchedOn(vendor.businessType))) throw new BookingError("This shop isn't taking bookings.");
  const info = typeInfo(vendor.businessType);
  const { service, q } = await priceVisit(vendorId, req.serviceId, req.optionLabel, req.extraIds);
  const plate = info.plates ? normalisePlate(req.plate ?? "") : "";
  if (info.plates && plate.length < 3) throw new BookingError("Enter your car's number plate.");
  const item = info.jobs ? (req.item ?? "").trim().slice(0, 80) : "";
  if (info.jobs && !item) throw new BookingError("Tell the shop what needs fixing.");

  let day: QueueDay;
  let scheduledAt: Date | null = null;
  if (req.date) {
    if (staffId && !(await db.staff.findFirst({ where: { id: staffId, vendorId, active: true } }))) throw new BookingError("Pick someone from the team.");
    scheduledAt = await checkSlot(vendor, req.date, req.slot ?? "", q.durationMins, staffId);
    // A later day's queue is made now and opened by the shop on the day.
    day = await db.queueDay.upsert({
      where: { vendorId_date: { vendorId, date: req.date } },
      create: { vendorId, date: req.date, staffIds: [], capacity: 0, status: "CLOSED" },
      update: {},
    });
  } else {
    const today = await todayQueue(vendorId);
    if (!today || today.status === "CLOSED") throw new BookingError("This shop's queue isn't open right now.");
    day = today;
    const all = await db.booking.findMany({ where: { queueDayId: day.id } });
    if (all.filter(countsTowardCapacity).length >= day.capacity) throw new BookingError("Sorry, the queue is full for today.");
    if (staffId && !day.staffIds.includes(staffId)) throw new BookingError("That staff member isn't working today.");
    if (staffId) await checkStaffHasTime(day, staffId, q.durationMins, now);
  }

  const existing = await db.booking.findFirst({
    where: { customerId: customer.id, queueDayId: day.id, status: { in: [...ACTIVE_STATUSES] } },
  });
  if (existing) throw new BookingError(req.date ? "You already have a booking with this shop that day." : "You're already in this queue.");

  // Basic (unverified) shops and free queues (government) take no money through Qless: no deposit and no booking fee.
  const paid = takesDeposits(vendor) && !info.free;
  const depositCents = paid ? Math.min(vendor.depositCents, q.priceCents) : 0;
  const feeCents = paid ? bookingFee(await getSettings()) : 0;
  const needsPayment = depositCents + feeCents > 0;
  return db.booking.create({
    data: {
      ref: await uniqueRef(),
      vendorId,
      queueDayId: day.id,
      customerId: customer.id,
      serviceId: service.id,
      staffId,
      position: await nextPosition(day.id),
      status: needsPayment ? "PENDING_PAYMENT" : "WAITING",
      checkInCode: code(4),
      priceCents: q.priceCents,
      durationMins: q.durationMins,
      optionLabel: q.optionLabel,
      extras: q.extras,
      extrasCents: q.extrasCents,
      ticketNo: await ticketFor(day.id, service.ticketLetter),
      scheduledAt,
      plate: plate || null,
      item: item || null,
      depositCents,
      feeCents,
      depositStatus: "NONE",
    },
  });
}

/** Refuses a booking for a staff member whose day would end before they could finish it. */
async function checkStaffHasTime(day: QueueDay, staffId: string, durationMins: number, now: Date) {
  const staff = await db.staff.findUnique({ where: { id: staffId } });
  if (!staff?.endTime) return;
  const view = await loadQueue(day, now);
  const last = view.entries.reduce((m, e) => Math.max(m, e.position), 0);
  const entries: QueueEntry[] = [...view.entries, { id: "_new", position: last + 1, durationMins, staffId, status: "WAITING" }];
  const start = estimateStarts({ now, staffIds: day.staffIds, entries, chairHours: view.chairHours, pausedUntil: day.status === "PAUSED" ? day.pausedUntil : null }).get("_new");
  if (start && start.getTime() + durationMins * 60_000 > sastAt(staff.endTime, now).getTime()) {
    throw new BookingError(`${staff.name} finishes at ${staff.endTime} and is fully booked for today. Pick someone else or "anyone".`);
  }
}

/** Deposit confirmed (PayFast ITN, or the test payment in development). */
export async function markPaid(bookingId: string, pfPaymentId: string | null): Promise<void> {
  const b = await db.booking.findUnique({ where: { id: bookingId }, include: { customer: true, vendor: true } });
  if (!b || b.status !== "PENDING_PAYMENT") return;
  await db.booking.update({
    where: { id: b.id },
    data: { status: "WAITING", depositStatus: "PAID", payfastPaymentId: pfPaymentId },
  });
  if (b.customer) {
    await notifyCustomer(
      b.customer,
      "You're in the queue",
      `Qless: you're in the queue at ${b.vendor.name}. Booking ${b.ref}, check-in code ${b.checkInCode}. We'll remind you 1 hour and 20 minutes before your turn.`,
      `/bookings/${b.id}`,
    );
  }
}

async function returnDeposit(b: Booking, reason: string): Promise<"REFUNDED" | "REFUND_PENDING" | "NONE"> {
  if (b.depositStatus !== "PAID" || b.depositCents === 0) return "NONE";
  // Only the deposit goes back; the Qless booking fee is not refunded.
  const ok = await refund(b.payfastPaymentId ?? "", b.depositCents, reason);
  return ok ? "REFUNDED" : "REFUND_PENDING";
}

/** Customer cancels. Refund only when outside the vendor's refund window. */
export async function cancelBooking(user: User, bookingId: string): Promise<{ refunded: boolean }> {
  const b = await db.booking.findFirst({
    where: { id: bookingId, customerId: user.id },
    include: { vendor: true, queueDay: true },
  });
  if (!b || !(ACTIVE_STATUSES as readonly string[]).includes(b.status)) throw new BookingError("This booking can't be cancelled.");
  if (b.status === "IN_SERVICE") throw new BookingError("You're already being served.");
  const view = await loadQueue(b.queueDay);
  const eta = view.etas.get(b.id);
  const eligible = b.status === "PENDING_PAYMENT" || (b.status === "WAITING" && refundOnCancel(new Date(), eta, b.vendor.refundWindowMins));
  const depositStatus = b.depositStatus === "PAID" ? (eligible ? await returnDeposit(b, "Cancelled by customer") : "FORFEITED") : b.depositStatus;
  await db.booking.update({
    where: { id: b.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), depositStatus },
  });
  return { refunded: eligible && b.depositStatus === "PAID" };
}

/** Customer drops back 1–3 places, once per booking, keeping the deposit. */
export async function moveBack(user: User, bookingId: string, places: number): Promise<void> {
  const b = await db.booking.findFirst({ where: { id: bookingId, customerId: user.id }, include: { queueDay: true } });
  if (!b || b.status !== "WAITING") throw new BookingError("You can only move back while you're waiting.");
  if (b.movedBack) throw new BookingError("You've already moved back once for this booking.");
  const view = await loadQueue(b.queueDay);
  const position = positionAfterMoveBack(view.entries, b.id, Math.max(1, Math.min(3, places)));
  // Reset reminders so they fire against the new time.
  await db.booking.update({ where: { id: b.id }, data: { position, movedBack: true, reminded60: false, reminded20: false } });
}

/** Calls the next waiting customer for a chair, or a chosen one when `bookingId` is given. */
export async function callNext(vendor: Vendor, staffId: string | null, bookingId?: string): Promise<FullBooking | null> {
  const day = await todayQueue(vendor.id);
  if (!day) throw new BookingError("Open today's queue first.");
  const next = await db.booking.findFirst({
    where: {
      queueDayId: day.id,
      status: "WAITING",
      ...(bookingId ? { id: bookingId } : {}),
      ...(staffId ? { OR: [{ staffId }, { staffId: null }] } : {}),
    },
    orderBy: { position: "asc" },
    include: { service: true, staff: true, customer: true },
  });
  if (!next) return null;
  // Calling a client ends the staff member's break.
  if (staffId) await db.staff.updateMany({ where: { id: staffId, breakUntil: { not: null } }, data: { breakUntil: null } });
  const updated = await db.booking.update({
    where: { id: next.id },
    data: { status: "CALLED", calledAt: new Date(), staffId: next.staffId ?? staffId },
    include: { service: true, staff: true, customer: true },
  });
  if (updated.customer && !updated.arrived) {
    await notifyCustomer(
      updated.customer,
      "It's your turn",
      `Qless: it's your turn at ${vendor.name}. Please arrive within ${ARRIVAL_WINDOW_MINS} minutes or your spot and deposit go to the next person. Check-in code ${updated.checkInCode}.`,
      `/bookings/${updated.id}`,
    );
  }
  return updated;
}

export async function startService(vendor: Vendor, bookingId: string): Promise<void> {
  await db.booking.updateMany({
    where: { id: bookingId, vendorId: vendor.id, status: { in: ["CALLED", "WAITING"] } },
    data: { status: "IN_SERVICE", startedAt: new Date(), arrived: true, ...(typeInfo(vendor.businessType).jobs ? { jobStage: "RECEIVED" } : {}) },
  });
}

export async function completeBooking(vendor: Vendor, bookingId: string): Promise<void> {
  const b = await db.booking.findFirst({ where: { id: bookingId, vendorId: vendor.id }, include: { customer: true } });
  if (!b || !["IN_SERVICE", "CALLED"].includes(b.status)) return;
  await db.booking.update({
    where: { id: b.id },
    data: {
      status: "DONE",
      completedAt: new Date(),
      startedAt: b.startedAt ?? new Date(),
      depositStatus: b.depositStatus === "PAID" ? "APPLIED" : b.depositStatus,
    },
  });
  if (b.customer) {
    await notifyCustomer(b.customer, "Thanks for visiting", `Qless: thanks for visiting ${vendor.name}. Tap to rate your visit.`, `/bookings/${b.id}`);
  }
}

/** The car is washed or the repair is done: tell the customer to come and collect. */
export async function markReady(vendor: Vendor, bookingId: string): Promise<void> {
  const b = await db.booking.findFirst({ where: { id: bookingId, vendorId: vendor.id, status: { in: ["IN_SERVICE", "CALLED"] } }, include: { customer: true } });
  if (!b) throw new BookingError("That job isn't in progress.");
  if (b.jobStage === "QUOTE" && b.quoteApproved !== true) throw new BookingError("The customer hasn't approved the quote yet.");
  await db.booking.update({ where: { id: b.id }, data: { readyAt: new Date(), jobStage: b.jobStage ? "READY" : null, startedAt: b.startedAt ?? new Date() } });
  const what = b.plate ? `Your car (${b.plate}) is ready` : b.item ? `Your ${b.item} is ready to collect` : "You're ready to collect";
  const body = `Qless: ${what} at ${vendor.name}.${b.quoteCents ? ` Amount due ${rand(b.quoteCents)}.` : ""}`;
  if (b.customer) await notifyCustomer(b.customer, what, body, `/bookings/${b.id}`);
  else if (b.walkInPhone) await sendSms(b.walkInPhone, body);
}

/** Moves a repair job to its next stage. Sending a quote waits for the customer to say yes. */
export async function setJobStage(vendor: Vendor, bookingId: string, stage: JobStage, quoteCents?: number, quoteNote?: string): Promise<void> {
  const b = await db.booking.findFirst({ where: { id: bookingId, vendorId: vendor.id, status: { in: ["IN_SERVICE", "CALLED", "WAITING"] } }, include: { customer: true } });
  if (!b) throw new BookingError("That job isn't open.");
  if (stage === "READY") return markReady(vendor, b.id);
  if (stage === "WORKING" && b.jobStage === "QUOTE" && b.quoteApproved !== true) throw new BookingError("Wait for the customer to approve the quote.");
  const data: Record<string, unknown> = { jobStage: stage, status: "IN_SERVICE", startedAt: b.startedAt ?? new Date(), arrived: true };
  if (stage === "QUOTE") {
    if (!quoteCents || quoteCents <= 0) throw new BookingError("Enter the quote amount.");
    Object.assign(data, { quoteCents, quoteNote: (quoteNote ?? "").slice(0, 200) || null, quoteApproved: null });
  }
  await db.booking.update({ where: { id: b.id }, data });
  const text =
    stage === "QUOTE"
      ? `Qless: ${vendor.name} sent a quote of ${rand(quoteCents!)} for your ${b.item ?? "job"}. Tap to approve or decline.`
      : `Qless: your ${b.item ?? "job"} at ${vendor.name} is now "${JOB_LABEL[stage].toLowerCase()}".`;
  if (b.customer) await notifyCustomer(b.customer, JOB_LABEL[stage], text, `/bookings/${b.id}`);
  else if (b.walkInPhone) await sendSms(b.walkInPhone, stage === "QUOTE" ? `${text.replace("Tap to approve or decline.", "")}Reply to the shop to approve. ${appUrl()}/t/${b.ref}` : text);
}

/** The customer says yes or no to a repair quote. */
export async function answerQuote(user: User, bookingId: string, yes: boolean): Promise<void> {
  const b = await db.booking.findFirst({ where: { id: bookingId, customerId: user.id, jobStage: "QUOTE" } });
  if (!b) throw new BookingError("There's no quote waiting on this job.");
  await db.booking.update({ where: { id: b.id }, data: { quoteApproved: yes } });
}

/** Repair jobs still open at a shop, over all days. */
export async function openJobs(vendorId: string) {
  return db.booking.findMany({
    where: { vendorId, jobStage: { not: null }, status: { in: ["WAITING", "CALLED", "IN_SERVICE"] } },
    include: { customer: true, service: true },
    orderBy: { createdAt: "asc" },
  });
}

/** No-show: deposit forfeited, and repeat offenders are blocked for a week. */
export async function markNoShow(bookingId: string, vendorId?: string): Promise<void> {
  const b = await db.booking.findFirst({
    where: { id: bookingId, ...(vendorId ? { vendorId } : {}), status: { in: ["CALLED", "WAITING"] } },
    include: { customer: true, vendor: true },
  });
  if (!b) return;
  await db.booking.update({
    where: { id: b.id },
    data: { status: "NO_SHOW", depositStatus: b.depositStatus === "PAID" ? "FORFEITED" : b.depositStatus },
  });
  if (!b.customer) return;
  await notifyCustomer(
    b.customer,
    "You missed your turn",
    `Qless: you missed your turn at ${b.vendor.name}, so your spot went to the next person${b.depositStatus === "PAID" && b.depositCents > 0 ? " and the deposit was kept" : ""}.`,
  );
  const since = new Date(Date.now() - 30 * 86_400_000);
  const misses = await db.booking.count({ where: { customerId: b.customer.id, status: "NO_SHOW", createdAt: { gte: since } } });
  if (misses >= NO_SHOW_LIMIT) {
    await db.user.update({ where: { id: b.customer.id }, data: { blockedUntil: new Date(Date.now() + BLOCK_DAYS * 86_400_000) } });
  }
}

export type WalkInRequest = { name: string; serviceId: string; staffId: string | null; optionLabel?: string | null; phone?: string | null; plate?: string; item?: string };

/** Adds a walk-in to the end of today's queue. With a number, they get their ticket and a live link by SMS. */
export async function addWalkIn(vendor: Vendor, req: WalkInRequest) {
  const day = await todayQueue(vendor.id);
  if (!day || day.status === "CLOSED") throw new BookingError("Open today's queue first.");
  const { service, q } = await priceVisit(vendor.id, req.serviceId, req.optionLabel);
  const info = typeInfo(vendor.businessType);
  const b = await db.booking.create({
    data: {
      ref: await uniqueRef(),
      vendorId: vendor.id,
      queueDayId: day.id,
      isWalkIn: true,
      walkInName: req.name.trim() || "Walk-in",
      walkInPhone: req.phone ?? null,
      serviceId: service.id,
      staffId: req.staffId,
      position: await nextPosition(day.id),
      status: "WAITING",
      checkInCode: code(4),
      arrived: true,
      priceCents: q.priceCents,
      durationMins: q.durationMins,
      optionLabel: q.optionLabel,
      ticketNo: await ticketFor(day.id, service.ticketLetter),
      plate: info.plates && req.plate ? normalisePlate(req.plate) || null : null,
      item: info.jobs && req.item ? req.item.trim().slice(0, 80) : null,
      jobStage: info.jobs ? "RECEIVED" : null,
      depositCents: 0,
    },
  });
  if (b.walkInPhone) {
    const view = await loadQueue(day);
    await sendSms(
      b.walkInPhone,
      `Qless: you're ticket ${b.ticketNo} at ${vendor.name}. ${aheadOf(view, b.id)} ahead of you, about ${time(view.etas.get(b.id))}. Follow your place: ${appUrl()}/t/${b.ref}`,
    );
  }
  return b;
}

export async function checkIn(vendor: Vendor, checkInCode: string): Promise<FullBooking | null> {
  const day = await todayQueue(vendor.id);
  if (!day) return null;
  const b = await db.booking.findFirst({
    where: { queueDayId: day.id, checkInCode: checkInCode.trim().toUpperCase(), status: { in: ["WAITING", "CALLED"] } },
  });
  if (!b) return null;
  return db.booking.update({ where: { id: b.id }, data: { arrived: true }, include: { service: true, staff: true, customer: true } });
}

export const PAUSE_REASONS: Record<string, string> = {
  "Load-shedding": "for load-shedding",
  "Staff on a break": "for a staff break",
  "Running late": "because it's running late",
  Other: "",
};

/** Pauses the queue and tells everyone waiting their new time. Nobody loses a deposit. */
export async function pauseQueue(vendor: Vendor, reason: string, minutes: number): Promise<number> {
  const day = await todayQueue(vendor.id);
  if (!day || day.status === "CLOSED") throw new BookingError("The queue isn't open.");
  const pausedUntil = new Date(Date.now() + minutes * 60_000);
  const updated = await db.queueDay.update({ where: { id: day.id }, data: { status: "PAUSED", pausedUntil, pauseReason: reason } });
  const view = await loadQueue(updated);
  const waiting = view.bookings.filter((b) => b.status === "WAITING" && b.customer);
  const why = PAUSE_REASONS[reason] ?? "";
  await Promise.allSettled(
    waiting.map((b) =>
      notifyCustomer(
        b.customer!,
        `${vendor.name} is paused`,
        `Qless: ${vendor.name} is paused${why ? " " + why : ""}. Your new estimated time is ${time(view.etas.get(b.id))}. You keep your spot and deposit.`,
        `/bookings/${b.id}`,
      ),
    ),
  );
  // Reminders should fire against the new times.
  await db.booking.updateMany({ where: { id: { in: waiting.map((b) => b.id) } }, data: { reminded60: false, reminded20: false } });
  return waiting.length;
}

/** One staff member takes a break. Their own clients get new times; "anyone" clients move to other chairs. */
export async function startBreak(vendor: Vendor, staff: Staff, minutes: number): Promise<number> {
  const day = await todayQueue(vendor.id);
  if (!day || day.status === "CLOSED" || !day.staffIds.includes(staff.id)) throw new BookingError("You're not on today's queue.");
  const breakUntil = new Date(Date.now() + minutes * 60_000);
  await db.staff.update({ where: { id: staff.id }, data: { breakUntil } });
  const view = await loadQueue(day);
  const mine = view.bookings.filter((b) => b.status === "WAITING" && b.staffId === staff.id && b.customer);
  await Promise.allSettled(
    mine.map((b) =>
      notifyCustomer(
        b.customer!,
        `${staff.name} is on a short break`,
        `Qless: ${staff.name} at ${vendor.name} is on a short break until ${time(breakUntil)}. Your new estimated time is ${time(view.etas.get(b.id))}. You keep your spot and deposit.`,
        `/bookings/${b.id}`,
      ),
    ),
  );
  await db.booking.updateMany({ where: { id: { in: mine.map((b) => b.id) } }, data: { reminded60: false, reminded20: false } });
  return mine.length;
}

export async function endBreak(staff: Staff): Promise<void> {
  await db.staff.update({ where: { id: staff.id }, data: { breakUntil: null } });
}

export async function resumeQueue(vendor: Vendor, notify = true): Promise<void> {
  const day = await todayQueue(vendor.id);
  if (!day || day.status !== "PAUSED") return;
  const updated = await db.queueDay.update({ where: { id: day.id }, data: { status: "OPEN", pausedUntil: null, pauseReason: null } });
  if (!notify) return;
  const view = await loadQueue(updated);
  await Promise.allSettled(
    view.bookings
      .filter((b) => b.status === "WAITING" && b.customer)
      .map((b) =>
        notifyCustomer(
          b.customer!,
          `${vendor.name} is open again`,
          `Qless: ${vendor.name} is serving again. Your estimated time is ${time(view.etas.get(b.id))}.`,
          `/bookings/${b.id}`,
        ),
      ),
  );
}

/**
 * Runs every minute from the cron endpoint:
 * expires unpaid bookings, turns expired calls into no-shows, ends finished pauses and sends reminders.
 */
export async function tick(now = new Date()): Promise<{ expired: number; noShows: number; reminders: number }> {
  const stale = await db.booking.updateMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: new Date(now.getTime() - UNPAID_EXPIRY_MINS * 60_000) } },
    data: { status: "CANCELLED", cancelledAt: now },
  });

  // POPIA: wipe uploaded verification files once they've been reviewed and kept long enough.
  await db.document.updateMany({
    where: { data: { not: null }, reviewedAt: { lt: new Date(now.getTime() - DOC_KEEP_DAYS * 86_400_000) } },
    data: { data: null },
  });

  await cleanupOldData(now);

  let noShows = 0;
  const called = await db.booking.findMany({ where: { status: "CALLED", arrived: false, calledAt: { not: null } } });
  for (const b of called) {
    if (arrivalExpired(now, b.calledAt!)) {
      await markNoShow(b.id);
      noShows++;
    }
  }

  const days = await db.queueDay.findMany({ where: { date: sastDate(now), status: { in: ["OPEN", "PAUSED"] } }, include: { vendor: true } });
  let reminders = 0;
  for (const day of days) {
    if (day.status === "PAUSED" && day.pausedUntil && day.pausedUntil <= now) {
      await resumeQueue(day.vendor);
      continue;
    }
    const view = await loadQueue(day, now);
    for (const b of view.bookings) {
      if (b.status !== "WAITING" || !b.customer || b.arrived) continue;
      const eta = view.etas.get(b.id);
      if (!eta) continue;
      for (const mins of dueReminders(now, eta, b)) {
        const text =
          mins === 60
            ? `Qless: about 1 hour until your turn at ${day.vendor.name} (around ${time(eta)}). ${aheadOf(view, b.id)} ahead of you.`
            : `Qless: about 20 minutes until your turn at ${day.vendor.name}. Start heading over. Check-in code ${b.checkInCode}.`;
        await notifyCustomer(b.customer, mins === 60 ? "1 hour to go" : "20 minutes to go", text, `/bookings/${b.id}`);
        await db.booking.update({
          where: { id: b.id },
          data: mins === 60 ? { reminded60: true } : { reminded60: true, reminded20: true },
        });
        reminders++;
      }
    }
  }
  return { expired: stale.count, noShows, reminders };
}

export async function averageRating(vendorId: string): Promise<{ avg: number; count: number }> {
  const r = await db.review.aggregate({ where: { vendorId }, _avg: { rating: true }, _count: true });
  return { avg: r._avg.rating ?? 0, count: r._count };
}

/** "Tue 4 Nov at 14:00" for a booking on a later day. */
export function bookedFor(b: Pick<Booking, "scheduledAt">): string | null {
  return b.scheduledAt ? `${shortDate(b.scheduledAt)} at ${time(b.scheduledAt)}` : null;
}

export function depositLine(b: Pick<Booking, "depositCents" | "depositStatus">): string {
  const map: Record<string, string> = {
    NONE: "No deposit",
    PAID: `Deposit paid ${rand(b.depositCents)}`,
    APPLIED: `Deposit applied ${rand(b.depositCents)}`,
    REFUND_PENDING: `Refund of ${rand(b.depositCents)} being processed`,
    REFUNDED: `Deposit refunded ${rand(b.depositCents)}`,
    FORFEITED: `Deposit kept ${rand(b.depositCents)}`,
  };
  return map[b.depositStatus];
}
