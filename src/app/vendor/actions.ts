"use server";
import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, requireVendor } from "@/lib/auth";
import {
  BookingError,
  addWalkIn,
  callNext,
  checkIn,
  closeQueue,
  completeBooking,
  markNoShow,
  markReady,
  openQueue,
  setJobStage,
  pauseQueue,
  resumeQueue,
  startService,
} from "@/lib/bookings";
import { geocode } from "@/lib/geocode";
import { ensureShopCode } from "@/lib/discover";
import { JOB_STAGES, TYPES, type JobStage, typeInfo, typeOfCategory } from "@/lib/business-types";
import { parseOptionLines } from "@/lib/pricing";
import { newShopCode } from "@/lib/shop-code";
import { normalisePhone, slugify, validCipc } from "@/lib/format";
import { back, str } from "@/lib/http";
import { walkInFromForm } from "@/lib/walk-in";
import { getSettings } from "@/lib/settings";
import { DOC_LABEL, DOC_TYPES, MAX_DOC_BYTES, requiredDocs } from "@/lib/verification";
import type { DocKind, VendorLevel } from "@prisma/client";

async function guard<T>(path: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof BookingError) back(path, { error: e.message });
    throw e;
  }
}

export async function registerVendor(form: FormData) {
  const user = await requireUser();
  if (await db.vendor.findUnique({ where: { ownerId: user.id } })) redirect("/vendor");
  const rules = await getSettings();
  const here = "/vendor/register";
  const level: VendorLevel = str(form, "level") === "BASIC" ? "BASIC" : "VERIFIED";
  if (level === "BASIC" && !rules.allowBasic) back(here, { error: "Basic listings are switched off right now. Choose Verified." });
  if (!form.get("agree")) back(here, { error: "Please agree to the terms and the vendor data agreement." });
  const name = str(form, "name");
  const category = str(form, "category");
  const cipc = level === "VERIFIED" ? str(form, "cipc") : "";
  const address = str(form, "address");
  const phone = normalisePhone(str(form, "phone")) ?? user.phone;
  if (!name || !address) back(here, { error: "Fill in your business name and address." });
  const businessType = typeOfCategory(category);
  if (!businessType) back(here, { error: "Pick a type of business." });
  if (rules.disabledTypes.includes(businessType)) back(here, { error: `${TYPES[businessType].label} businesses can't sign up on Qless yet.` });
  if (level === "VERIFIED" && (rules.requireCipc || cipc)) {
    if (!validCipc(cipc)) back(here, { error: "Enter your CIPC registration number, like 2021/483920/07." });
    if (await db.vendor.findFirst({ where: { cipc, status: { not: "REJECTED" } } })) {
      back(here, { error: "That CIPC number is already registered on Qless." });
    }
  }
  const bank = level === "VERIFIED" ? bankFields(form) : null;
  if (bank && rules.requireBank && (!bank.bankName || !bank.bankAccountName || !bank.bankAccountNo)) {
    back(here, { error: "Fill in your bank details so we can pay out your deposits." });
  }
  let slug = slugify(name) || "shop";
  for (let i = 2; await db.vendor.findUnique({ where: { slug } }); i++) slug = `${slugify(name)}-${i}`;
  const lat = Number(str(form, "lat"));
  const lng = Number(str(form, "lng"));
  const where = lat && lng ? { lat, lng } : await geocode(address);
  await db.$transaction([
    db.vendor.create({
      data: { ownerId: user.id, name, slug, code: await freeShopCode(), category, businessType, cipc: cipc || null, level, address, phone, lat: where?.lat, lng: where?.lng, ...(bank ?? {}) },
    }),
    db.user.update({ where: { id: user.id }, data: { role: user.role === "ADMIN" ? "ADMIN" : "VENDOR" } }),
  ]);
  back("/vendor/documents", { notice: "Business saved. Now upload your documents." });
}

async function freeShopCode(): Promise<string> {
  for (;;) {
    const code = newShopCode();
    if (!(await db.vendor.findUnique({ where: { code } }))) return code;
  }
}

function bankFields(form: FormData) {
  return {
    bankName: str(form, "bankName").slice(0, 60) || null,
    bankAccountName: str(form, "bankAccountName").slice(0, 80) || null,
    bankAccountNo: str(form, "bankAccountNo").replace(/\D/g, "").slice(0, 20) || null,
  };
}

export async function saveBank(form: FormData) {
  const { vendor } = await requireVendor();
  const bank = bankFields(form);
  if (!bank.bankName || !bank.bankAccountName || !bank.bankAccountNo || bank.bankAccountNo.length < 6) {
    back("/vendor/money", { error: "Fill in the bank, account holder and account number." });
  }
  await db.vendor.update({ where: { id: vendor.id }, data: bank });
  back("/vendor/money", { notice: "Bank details saved. Upload a new bank letter if the account changed." });
}

export async function uploadDocument(form: FormData) {
  const { vendor } = await requireVendor();
  const here = "/vendor/documents";
  const kind = str(form, "kind") as DocKind;
  if (!(kind in DOC_LABEL)) back(here, { error: "Pick which document this is." });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) back(here, { error: "Choose a file to upload." });
  if (!DOC_TYPES.includes(file.type)) back(here, { error: "Upload a photo (JPG, PNG, WebP) or a PDF." });
  if (file.size > MAX_DOC_BYTES) back(here, { error: "That file is too big. Keep it under 4 MB, or take a smaller photo." });
  // A new upload replaces the old one of the same kind.
  await db.$transaction([
    db.document.deleteMany({ where: { vendorId: vendor.id, kind } }),
    db.document.create({
      data: { vendorId: vendor.id, kind, fileName: file.name.slice(0, 120) || kind, mime: file.type, data: Buffer.from(await file.arrayBuffer()) },
    }),
  ]);
  back(here, { notice: `${DOC_LABEL[kind]} uploaded.` });
}

/** A Basic shop asks to become Verified: it goes back to the admin with the new documents. */
export async function upgradeToVerified() {
  const { vendor } = await requireVendor();
  if (vendor.level === "VERIFIED") redirect("/vendor/account");
  const rules = await getSettings();
  const docs = await db.document.findMany({ where: { vendorId: vendor.id } });
  const missing = requiredDocs("VERIFIED", rules).filter((k) => !docs.some((d) => d.kind === k));
  if (missing.length) back("/vendor/documents?level=VERIFIED", { error: `Upload these first: ${missing.map((k) => DOC_LABEL[k]).join(", ")}.` });
  if (rules.requireCipc && !vendor.cipc) back("/vendor/account", { error: "Add your CIPC number in Business details first." });
  if (rules.requireBank && !vendor.bankAccountNo) back("/vendor/money", { error: "Add your bank details first." });
  await db.vendor.update({ where: { id: vendor.id }, data: { upgradeRequested: true } });
  back("/vendor/account", { notice: "Sent to Qless. We'll check your documents and let you know by SMS." });
}

/** Shop profile: where the shop is and when it's open. */
export async function saveShop(form: FormData) {
  const { vendor } = await requireVendor();
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => (form.get(`day${i}`) === "on" ? "1" : "0")).join("");
  const openTime = str(form, "openTime");
  const closeTime = str(form, "closeTime");
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!hhmm.test(openTime) || !hhmm.test(closeTime) || openTime >= closeTime) back("/vendor/setup", { error: "Check your opening and closing times." });
  const address = str(form, "address") || vendor.address;
  const lat = Number(str(form, "lat"));
  const lng = Number(str(form, "lng"));
  const where = lat && lng ? { lat, lng } : address !== vendor.address ? await geocode(address) : null;
  await db.vendor.update({
    where: { id: vendor.id },
    data: { openDays: days, openTime, closeTime, address, ...(where ? { lat: where.lat, lng: where.lng } : {}) },
  });
  back("/vendor/setup", { notice: "Shop profile saved." });
}

/** Deposit rules, on the Money page. Only Verified shops take deposits. */
export async function saveDeposit(form: FormData) {
  const { vendor } = await requireVendor();
  if (vendor.level !== "VERIFIED") back("/vendor/money", { error: "Only Verified shops take deposits." });
  const deposit = Math.round(Number(str(form, "deposit")) * 100);
  const refundHours = Number(str(form, "refundHours"));
  if (!(deposit >= 0 && deposit <= 100_000)) back("/vendor/money", { error: "Deposit must be between R0 and R1,000." });
  if (!(refundHours >= 0 && refundHours <= 48)) back("/vendor/money", { error: "Refund window must be between 0 and 48 hours." });
  await db.vendor.update({ where: { id: vendor.id }, data: { depositCents: deposit, refundWindowMins: Math.round(refundHours * 60) } });
  back("/vendor/money", { notice: "Deposit saved." });
}

/** Reads and checks the service form shared by Add and Edit. */
function serviceFromForm(form: FormData, free: boolean) {
  const name = str(form, "name").slice(0, 60);
  const isExtra = form.get("isExtra") === "on";
  const durationMins = Math.round(Number(str(form, "duration") || (isExtra ? "0" : "")));
  const priceCents = Math.round(Number(str(form, "price") || "0") * 100);
  const minMins = isExtra ? 0 : 5;
  if (!name || !(durationMins >= minMins && durationMins <= 480)) return `Give it a name and a time between ${minMins} and 480 minutes.`;
  // Government and other free queues can list free services; everyone else needs a price.
  if (!(priceCents > 0 || (free && priceCents === 0)) || priceCents > 10_000_000) return "Enter a price.";
  const options = isExtra ? [] : parseOptionLines(str(form, "options"), durationMins);
  if (typeof options === "string") return options;
  const letter = str(form, "ticketLetter").toUpperCase();
  if (letter && !/^[A-Z]$/.test(letter)) return "The ticket letter must be one letter, like A.";
  return { name, isExtra, durationMins, priceCents, options, ticketLetter: letter || null, bring: str(form, "bring").slice(0, 200) };
}

export async function addService(form: FormData) {
  const { vendor } = await requireVendor();
  const data = serviceFromForm(form, typeInfo(vendor.businessType).free);
  if (typeof data === "string") back("/vendor/services", { error: data });
  await db.service.create({ data: { vendorId: vendor.id, ...data } });
  back("/vendor/services", { notice: `Added ${data.name}.` });
}

export async function saveService(form: FormData) {
  const { vendor } = await requireVendor();
  const id = str(form, "id");
  const here = `/vendor/services/${id}`;
  const data = serviceFromForm(form, typeInfo(vendor.businessType).free);
  if (typeof data === "string") back(here, { error: data });
  const res = await db.service.updateMany({ where: { id, vendorId: vendor.id, active: true }, data });
  if (!res.count) back("/vendor/services", { error: "Service not found." });
  back("/vendor/services", { notice: `Saved ${data.name}. New bookings use the new price; booked clients keep theirs.` });
}

export async function removeService(form: FormData) {
  const { vendor } = await requireVendor();
  await db.service.updateMany({ where: { id: str(form, "id"), vendorId: vendor.id }, data: { active: false } });
  back("/vendor/services", { notice: "Service removed." });
}

export async function addStaff(form: FormData) {
  const { vendor } = await requireVendor();
  const name = str(form, "name");
  if (!name) back("/vendor/team", { error: "Enter the staff member's name." });
  const raw = str(form, "phone");
  const phone = raw ? normalisePhone(raw) : null;
  if (raw && !phone) back("/vendor/team", { error: "Enter a valid South African cellphone number for the staff member." });
  await db.staff.create({ data: { vendorId: vendor.id, name, phone } });
  back("/vendor/team", { notice: phone ? `Added ${name}. They can sign in with ${raw} to see their chair.` : `Added ${name}.` });
}

export async function setStaffPhone(form: FormData) {
  const { vendor } = await requireVendor();
  const raw = str(form, "phone");
  const phone = raw ? normalisePhone(raw) : null;
  if (raw && !phone) back("/vendor/team", { error: "Enter a valid South African cellphone number." });
  await db.staff.updateMany({ where: { id: str(form, "id"), vendorId: vendor.id }, data: { phone } });
  back("/vendor/team", { notice: phone ? "Saved. They can now sign in to their own chair screen." : "Staff login removed." });
}

export async function removeStaff(form: FormData) {
  const { vendor } = await requireVendor();
  await db.staff.updateMany({ where: { id: str(form, "id"), vendorId: vendor.id }, data: { active: false } });
  back("/vendor/team", { notice: "Staff member removed." });
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The owner sets one staff member's working days, hours and lunch. Blank times mean the shop's hours. */
export async function saveStaffHours(form: FormData) {
  const { vendor } = await requireVendor();
  const here = "/vendor/team";
  const workDays = [0, 1, 2, 3, 4, 5, 6].map((i) => (form.get(`day${i}`) === "on" ? "1" : "0")).join("");
  const t = (k: string) => str(form, k) || null;
  const [startTime, endTime, lunchStart, lunchEnd] = [t("startTime"), t("endTime"), t("lunchStart"), t("lunchEnd")];
  if ([startTime, endTime, lunchStart, lunchEnd].some((v) => v && !HHMM.test(v))) back(here, { error: "Use times like 09:00." });
  if (!startTime !== !endTime) back(here, { error: "Fill in both the start and finish time, or leave both blank." });
  if (startTime && endTime && startTime >= endTime) back(here, { error: "The finish time must be after the start time." });
  if (!lunchStart !== !lunchEnd) back(here, { error: "Fill in both lunch times, or leave both blank." });
  if (lunchStart && lunchEnd && lunchStart >= lunchEnd) back(here, { error: "Lunch must end after it starts." });
  const res = await db.staff.updateMany({ where: { id: str(form, "id"), vendorId: vendor.id }, data: { workDays, startTime, endTime, lunchStart, lunchEnd } });
  if (!res.count) back(here, { error: "Staff member not found." });
  back(here, { notice: "Hours saved." });
}

const MAX_PHOTO_BYTES = 1_500_000;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function addPhoto(form: FormData) {
  const { vendor } = await requireVendor();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) back("/vendor/photos", { error: "Choose a photo." });
  if (!PHOTO_TYPES.includes(file.type)) back("/vendor/photos", { error: "Photos must be JPG, PNG or WebP." });
  if (file.size > MAX_PHOTO_BYTES) back("/vendor/photos", { error: "That photo is too big. Keep it under 1.5 MB." });
  if ((await db.photo.count({ where: { vendorId: vendor.id } })) >= 12) back("/vendor/photos", { error: "You can have up to 12 photos. Remove one first." });
  await db.photo.create({
    data: { vendorId: vendor.id, caption: str(form, "caption").slice(0, 40), mime: file.type, data: Buffer.from(await file.arrayBuffer()) },
  });
  back("/vendor/photos", { notice: "Photo added." });
}

export async function removePhoto(form: FormData) {
  const { vendor } = await requireVendor();
  await db.photo.deleteMany({ where: { id: str(form, "id"), vendorId: vendor.id } });
  back("/vendor/photos", { notice: "Photo removed." });
}

export async function openToday(form: FormData) {
  const { vendor } = await requireVendor();
  const staffIds = form.getAll("staffIds").filter((v): v is string => typeof v === "string");
  const valid = await db.staff.findMany({ where: { vendorId: vendor.id, active: true, id: { in: staffIds } } });
  await guard("/vendor/start", () => openQueue(vendor, valid.map((s) => s.id)));
  redirect("/vendor");
}

export async function closeToday() {
  const { vendor } = await requireVendor();
  await closeQueue(vendor);
  back("/vendor", { notice: "Queue closed for today. No new bookings." });
}

export async function callNextAction(form: FormData) {
  const { vendor } = await requireVendor();
  const staffId = str(form, "staffId") || null;
  const b = await guard("/vendor", () => callNext(vendor, staffId));
  if (!b) back("/vendor", { notice: "Nobody is waiting." });
  const name = b.customer?.name ?? b.walkInName ?? "Next customer";
  back("/vendor", { notice: b.arrived ? `${name} called to the chair.` : `${name} notified. They have 15 minutes to arrive.` });
}

export async function startAction(form: FormData) {
  const { vendor } = await requireVendor();
  await startService(vendor, str(form, "id"));
  redirect("/vendor");
}

export async function doneAction(form: FormData) {
  const { vendor } = await requireVendor();
  await completeBooking(vendor, str(form, "id"));
  redirect("/vendor");
}

export async function noShowAction(form: FormData) {
  const { vendor } = await requireVendor();
  await markNoShow(str(form, "id"), vendor.id);
  back("/vendor", { notice: "Marked as a no-show. The deposit is kept." });
}

export async function walkInAction(form: FormData) {
  const { vendor } = await requireVendor();
  const staffId = str(form, "staffId");
  const req = walkInFromForm(form, staffId && staffId !== "any" ? staffId : null);
  if (typeof req === "string") back("/vendor/walk-in", { error: req });
  const b = await guard("/vendor/walk-in", () => addWalkIn(vendor, req));
  if (form.get("print")) redirect(`/t/${b.ref}?print=1`);
  back("/vendor", { notice: `Walk-in added to the end of the queue as ticket ${b.ticketNo}.${b.walkInPhone ? " Ticket sent by SMS." : ""}` });
}

export async function checkInAction(form: FormData) {
  const { vendor } = await requireVendor();
  const b = await checkIn(vendor, str(form, "code"));
  if (!b) back("/vendor", { error: "No booking with that code. Check the letters and try again." });
  back("/vendor", { notice: `${b.customer?.name ?? b.walkInName} checked in.` });
}

export async function pauseAction(form: FormData) {
  const { vendor } = await requireVendor();
  const minutes = Number(str(form, "minutes"));
  if (![15, 30, 60, 120].includes(minutes)) back("/vendor/pause", { error: "Pick how long to pause for." });
  const n = await guard("/vendor/pause", () => pauseQueue(vendor, str(form, "reason") || "Other", minutes));
  back("/vendor", { notice: `Queue paused. ${n} customer${n === 1 ? "" : "s"} notified.` });
}

export async function resumeAction() {
  const { vendor } = await requireVendor();
  await resumeQueue(vendor);
  back("/vendor", { notice: "Queue resumed. Customers notified." });
}

/** Makes a fresh secret for the waiting-room TV link. Old links stop working. */
export async function resetTvLink() {
  const { vendor } = await requireVendor();
  await ensureShopCode(vendor);
  await db.vendor.update({ where: { id: vendor.id }, data: { tvKey: randomBytes(12).toString("base64url") } });
  back("/vendor/tv", { notice: "New TV link ready." });
}

export async function readyAction(form: FormData) {
  const { vendor } = await requireVendor();
  await guard("/vendor", () => markReady(vendor, str(form, "id")));
  back("/vendor", { notice: "Customer told it's ready." });
}

/** Moves a repair job on, or sends a quote. */
export async function jobStageAction(form: FormData) {
  const { vendor } = await requireVendor();
  const stage = str(form, "stage");
  if (!(JOB_STAGES as readonly string[]).includes(stage)) back("/vendor/jobs", { error: "Pick a stage." });
  const quote = Math.round(Number(str(form, "quote")) * 100);
  await guard("/vendor/jobs", () => setJobStage(vendor, str(form, "id"), stage as JobStage, quote || undefined, str(form, "note")));
  back("/vendor/jobs", { notice: stage === "QUOTE" ? "Quote sent. You'll see here when the customer answers." : "Job updated. The customer was told." });
}
