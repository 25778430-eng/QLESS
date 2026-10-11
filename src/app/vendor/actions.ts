"use server";
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
  openQueue,
  pauseQueue,
  resumeQueue,
  startService,
} from "@/lib/bookings";
import { geocode } from "@/lib/geocode";
import { normalisePhone, slugify, validCipc } from "@/lib/format";
import { back, str } from "@/lib/http";

const CATEGORIES = ["Barber", "Nail technician", "Hair salon", "Other"];

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
  const name = str(form, "name");
  const category = str(form, "category");
  const cipc = str(form, "cipc");
  const address = str(form, "address");
  const phone = normalisePhone(str(form, "phone")) ?? user.phone;
  if (!name || !address) back("/vendor/register", { error: "Fill in your business name and address." });
  if (!CATEGORIES.includes(category)) back("/vendor/register", { error: "Pick a type of business." });
  if (!validCipc(cipc)) back("/vendor/register", { error: "Enter your CIPC registration number, like 2021/483920/07." });
  if (await db.vendor.findFirst({ where: { cipc, status: { not: "REJECTED" } } })) {
    back("/vendor/register", { error: "That CIPC number is already registered on Qless." });
  }
  let slug = slugify(name) || "shop";
  for (let i = 2; await db.vendor.findUnique({ where: { slug } }); i++) slug = `${slugify(name)}-${i}`;
  const lat = Number(str(form, "lat"));
  const lng = Number(str(form, "lng"));
  const where = lat && lng ? { lat, lng } : await geocode(address);
  await db.$transaction([
    db.vendor.create({ data: { ownerId: user.id, name, slug, category, cipc, address, phone, lat: where?.lat, lng: where?.lng } }),
    db.user.update({ where: { id: user.id }, data: { role: user.role === "ADMIN" ? "ADMIN" : "VENDOR" } }),
  ]);
  redirect("/vendor");
}

export async function saveShop(form: FormData) {
  const { vendor } = await requireVendor();
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => (form.get(`day${i}`) === "on" ? "1" : "0")).join("");
  const openTime = str(form, "openTime");
  const closeTime = str(form, "closeTime");
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!hhmm.test(openTime) || !hhmm.test(closeTime) || openTime >= closeTime) back("/vendor/setup", { error: "Check your opening and closing times." });
  const deposit = Math.round(Number(str(form, "deposit")) * 100);
  const refundHours = Number(str(form, "refundHours"));
  if (!(deposit >= 0 && deposit <= 100_000)) back("/vendor/setup", { error: "Deposit must be between R0 and R1,000." });
  if (!(refundHours >= 0 && refundHours <= 48)) back("/vendor/setup", { error: "Refund window must be between 0 and 48 hours." });
  const address = str(form, "address") || vendor.address;
  const lat = Number(str(form, "lat"));
  const lng = Number(str(form, "lng"));
  const where = lat && lng ? { lat, lng } : address !== vendor.address ? await geocode(address) : null;
  await db.vendor.update({
    where: { id: vendor.id },
    data: {
      openDays: days,
      openTime,
      closeTime,
      depositCents: deposit,
      refundWindowMins: Math.round(refundHours * 60),
      address,
      ...(where ? { lat: where.lat, lng: where.lng } : {}),
    },
  });
  back("/vendor/setup", { notice: "Shop details saved." });
}

export async function addService(form: FormData) {
  const { vendor } = await requireVendor();
  const name = str(form, "name");
  const durationMins = Math.round(Number(str(form, "duration")));
  const priceCents = Math.round(Number(str(form, "price")) * 100);
  if (!name || !(durationMins >= 5 && durationMins <= 480) || !(priceCents > 0)) {
    back("/vendor/setup", { error: "A service needs a name, a time between 5 and 480 minutes, and a price." });
  }
  await db.service.create({ data: { vendorId: vendor.id, name, durationMins, priceCents } });
  back("/vendor/setup", { notice: `Added ${name}.` });
}

export async function removeService(form: FormData) {
  const { vendor } = await requireVendor();
  await db.service.updateMany({ where: { id: str(form, "id"), vendorId: vendor.id }, data: { active: false } });
  back("/vendor/setup", { notice: "Service removed." });
}

export async function addStaff(form: FormData) {
  const { vendor } = await requireVendor();
  const name = str(form, "name");
  if (!name) back("/vendor/setup", { error: "Enter the staff member's name." });
  await db.staff.create({ data: { vendorId: vendor.id, name } });
  back("/vendor/setup", { notice: `Added ${name}.` });
}

export async function removeStaff(form: FormData) {
  const { vendor } = await requireVendor();
  await db.staff.updateMany({ where: { id: str(form, "id"), vendorId: vendor.id }, data: { active: false } });
  back("/vendor/setup", { notice: "Staff member removed." });
}

const MAX_PHOTO_BYTES = 1_500_000;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function addPhoto(form: FormData) {
  const { vendor } = await requireVendor();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) back("/vendor/setup", { error: "Choose a photo." });
  if (!PHOTO_TYPES.includes(file.type)) back("/vendor/setup", { error: "Photos must be JPG, PNG or WebP." });
  if (file.size > MAX_PHOTO_BYTES) back("/vendor/setup", { error: "That photo is too big. Keep it under 1.5 MB." });
  if ((await db.photo.count({ where: { vendorId: vendor.id } })) >= 12) back("/vendor/setup", { error: "You can have up to 12 photos. Remove one first." });
  await db.photo.create({
    data: { vendorId: vendor.id, caption: str(form, "caption").slice(0, 40), mime: file.type, data: Buffer.from(await file.arrayBuffer()) },
  });
  back("/vendor/setup", { notice: "Photo added." });
}

export async function removePhoto(form: FormData) {
  const { vendor } = await requireVendor();
  await db.photo.deleteMany({ where: { id: str(form, "id"), vendorId: vendor.id } });
  back("/vendor/setup", { notice: "Photo removed." });
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
  await guard("/vendor", () => addWalkIn(vendor, str(form, "name"), str(form, "serviceId"), staffId && staffId !== "any" ? staffId : null));
  back("/vendor", { notice: "Walk-in added to the end of the queue." });
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
