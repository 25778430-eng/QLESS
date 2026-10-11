import "server-only";
import { randomInt } from "node:crypto";
import type { Booking, QueueDay, Service, Staff, User, Vendor } from "@prisma/client";
import { db } from "./db";
import { notifyCustomer } from "./notify";
import { refund } from "./payfast";
import { bookingFee } from "./fees";
import { getSettings } from "./settings";
import { rand, sastDate, sastWeekday, time } from "./format";
import {
  ARRIVAL_WINDOW_MINS,
  arrivalExpired,
  dailyCapacity,
  dueReminders,
  estimateStarts,
  peopleAhead,
  positionAfterMoveBack,
  refundOnCancel,
  type QueueEntry,
} from "./queue";

export const MAX_ACTIVE_BOOKINGS = 2;
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
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function code(len: number): string {
  return Array.from({ length: len }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export function isOpenToday(vendor: Vendor, now = new Date()): boolean {
  return vendor.openDays[sastWeekday(now)] === "1";
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
      durationMins: b.service.durationMins,
      staffId: b.staffId,
      status: b.status as QueueEntry["status"],
      startedAt: b.startedAt,
      calledAt: b.calledAt,
    }));
  const etas = estimateStarts({
    now,
    staffIds: day.staffIds,
    entries,
    pausedUntil: day.status === "PAUSED" ? day.pausedUntil : null,
  });
  return { day, bookings, etas, entries };
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
  if (!staffIds.length) throw new BookingError("Pick at least one staff member working today.");
  const services = await db.service.findMany({ where: { vendorId: vendor.id, active: true } });
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

/** Customer joins today's queue. Deposit-free vendors go straight to WAITING. */
export async function createBooking(customer: User, vendorId: string, serviceId: string, staffId: string | null) {
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
  if (!vendor || vendor.status !== "APPROVED") throw new BookingError("This shop isn't taking bookings.");
  const day = await todayQueue(vendorId);
  if (!day || day.status === "CLOSED") throw new BookingError("This shop's queue isn't open right now.");

  const existing = await db.booking.findFirst({
    where: { customerId: customer.id, queueDayId: day.id, status: { in: [...ACTIVE_STATUSES] } },
  });
  if (existing) throw new BookingError("You're already in this queue.");

  const all = await db.booking.findMany({ where: { queueDayId: day.id } });
  if (all.filter(countsTowardCapacity).length >= day.capacity) throw new BookingError("Sorry, the queue is full for today.");

  const service = await db.service.findFirst({ where: { id: serviceId, vendorId, active: true } });
  if (!service) throw new BookingError("Pick a service.");
  if (staffId && !day.staffIds.includes(staffId)) throw new BookingError("That staff member isn't working today.");

  const depositCents = Math.min(vendor.depositCents, service.priceCents);
  const feeCents = bookingFee(await getSettings());
  const needsPayment = depositCents + feeCents > 0;
  return db.booking.create({
    data: {
      ref: await uniqueRef(),
      vendorId,
      queueDayId: day.id,
      customerId: customer.id,
      serviceId,
      staffId,
      position: await nextPosition(day.id),
      status: needsPayment ? "PENDING_PAYMENT" : "WAITING",
      checkInCode: code(4),
      priceCents: service.priceCents,
      depositCents,
      feeCents,
      depositStatus: "NONE",
    },
  });
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

/** Vendor calls the next waiting customer for a chair. */
export async function callNext(vendor: Vendor, staffId: string | null): Promise<FullBooking | null> {
  const day = await todayQueue(vendor.id);
  if (!day) throw new BookingError("Open today's queue first.");
  const next = await db.booking.findFirst({
    where: {
      queueDayId: day.id,
      status: "WAITING",
      ...(staffId ? { OR: [{ staffId }, { staffId: null }] } : {}),
    },
    orderBy: { position: "asc" },
    include: { service: true, staff: true, customer: true },
  });
  if (!next) return null;
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
    data: { status: "IN_SERVICE", startedAt: new Date(), arrived: true },
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

export async function addWalkIn(vendor: Vendor, name: string, serviceId: string, staffId: string | null) {
  const day = await todayQueue(vendor.id);
  if (!day || day.status === "CLOSED") throw new BookingError("Open today's queue first.");
  const service = await db.service.findFirst({ where: { id: serviceId, vendorId: vendor.id } });
  if (!service) throw new BookingError("Pick a service.");
  return db.booking.create({
    data: {
      ref: await uniqueRef(),
      vendorId: vendor.id,
      queueDayId: day.id,
      isWalkIn: true,
      walkInName: name.trim() || "Walk-in",
      serviceId,
      staffId,
      position: await nextPosition(day.id),
      status: "WAITING",
      checkInCode: code(4),
      arrived: true,
      priceCents: service.priceCents,
      depositCents: 0,
    },
  });
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
