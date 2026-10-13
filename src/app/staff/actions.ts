"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { BookingError, addWalkIn, todayQueue, callNext, completeBooking, markNoShow, startService } from "@/lib/bookings";
import { back, str } from "@/lib/http";

/** Staff can only act on bookings in their own chair. */
async function mine(id: string) {
  const { staff, vendor } = await requireStaff();
  const b = await db.booking.findFirst({ where: { id, vendorId: vendor.id, staffId: staff.id } });
  if (!b) back("/staff", { error: "That client isn't in your chair." });
  return { staff, vendor, b };
}

export async function staffCallNext() {
  const { staff, vendor } = await requireStaff();
  const day = await todayQueue(vendor.id);
  if (!day || day.status === "CLOSED" || !day.staffIds.includes(staff.id)) back("/staff", { error: "You're not on today's queue. Ask the owner to add you when they open it." });
  let b;
  try {
    b = await callNext(vendor, staff.id);
  } catch (e) {
    if (e instanceof BookingError) back("/staff", { error: e.message });
    throw e;
  }
  if (!b) back("/staff", { notice: "Nobody is waiting for you." });
  const name = b.customer?.name ?? b.walkInName ?? "Next client";
  back("/staff", { notice: b.arrived ? `${name} called to your chair.` : `${name} notified. They have 15 minutes to arrive.` });
}

export async function staffStart(form: FormData) {
  const { vendor, b } = await mine(str(form, "id"));
  await startService(vendor, b.id);
  redirect("/staff");
}

export async function staffDone(form: FormData) {
  const { vendor, b } = await mine(str(form, "id"));
  await completeBooking(vendor, b.id);
  redirect("/staff");
}

export async function staffNoShow(form: FormData) {
  const { vendor, b } = await mine(str(form, "id"));
  await markNoShow(b.id, vendor.id);
  back("/staff", { notice: "Marked as a no-show." });
}

export async function staffWalkIn(form: FormData) {
  const { staff, vendor } = await requireStaff();
  try {
    await addWalkIn(vendor, str(form, "name"), str(form, "serviceId"), staff.id);
  } catch (e) {
    if (e instanceof BookingError) back("/staff/walk-in", { error: e.message });
    throw e;
  }
  back("/staff", { notice: "Walk-in added to your queue." });
}
