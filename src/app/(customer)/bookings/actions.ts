"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BookingError, answerQuote, cancelBooking, markPaid, markRestPaid, moveBack } from "@/lib/bookings";
import { restDue } from "@/lib/fees";
import { db } from "@/lib/db";
import { payfastConfigured } from "@/lib/payfast";
import { back, str } from "@/lib/http";

export async function cancelAction(form: FormData) {
  const user = await requireUser();
  const id = str(form, "bookingId");
  try {
    const { refunded } = await cancelBooking(user, id);
    back("/bookings", { notice: refunded ? "Booking cancelled. Your deposit refund is on its way." : "Booking cancelled." });
  } catch (e) {
    if (e instanceof BookingError) back(`/bookings/${id}`, { error: e.message });
    throw e;
  }
}

export async function moveBackAction(form: FormData) {
  const user = await requireUser();
  const id = str(form, "bookingId");
  const places = Number(str(form, "places")) || 1;
  try {
    await moveBack(user, id, places);
  } catch (e) {
    if (e instanceof BookingError) back(`/bookings/${id}`, { error: e.message });
    throw e;
  }
  back(`/bookings/${id}`, { notice: `Moved back ${places} place${places > 1 ? "s" : ""}. The shop has been told.` });
}

/** Test payment, only available when PayFast keys are not set and not in production. */
export async function testPayAction(form: FormData) {
  const user = await requireUser();
  if (payfastConfigured() || process.env.NODE_ENV === "production") redirect("/bookings");
  const id = str(form, "bookingId");
  const b = await db.booking.findFirst({ where: { id, customerId: user.id } });
  if (b) await markPaid(b.id, `test-${b.id}`);
  back(`/bookings/${id}`, { notice: "Test payment approved." });
}

export async function testRestPayAction(form: FormData) {
  const user = await requireUser();
  if (payfastConfigured() || process.env.NODE_ENV === "production") redirect("/bookings");
  const id = str(form, "bookingId");
  const b = await db.booking.findFirst({ where: { id, customerId: user.id } });
  if (b && restDue(b) > 0) await markRestPaid(b.id, restDue(b), `test-rest-${b.id}`);
  back(`/bookings/${id}`, { notice: "Test payment approved." });
}

export async function reviewAction(form: FormData) {
  const user = await requireUser();
  const id = str(form, "bookingId");
  const rating = Math.round(Number(str(form, "rating")));
  const b = await db.booking.findFirst({ where: { id, customerId: user.id }, include: { review: true } });
  // Reviews only after a completed booking, one per booking.
  if (!b || b.status !== "DONE") back(`/bookings/${id}`, { error: "You can review a shop after your visit." });
  if (b.review) back(`/bookings/${id}`, { error: "You've already reviewed this visit." });
  if (!(rating >= 1 && rating <= 5)) back(`/bookings/${id}`, { error: "Pick a star rating." });
  await db.review.create({
    data: { bookingId: b.id, vendorId: b.vendorId, customerId: user.id, rating, text: str(form, "text").slice(0, 500) },
  });
  back(`/bookings/${id}`, { notice: "Thanks! Your review is posted." });
}

export async function quoteAction(form: FormData) {
  const user = await requireUser();
  const id = str(form, "bookingId");
  const yes = str(form, "answer") === "yes";
  try {
    await answerQuote(user, id, yes);
  } catch (e) {
    if (e instanceof BookingError) back(`/bookings/${id}`, { error: e.message });
    throw e;
  }
  back(`/bookings/${id}`, { notice: yes ? "Quote approved. The shop will start the work." : "Quote declined. The shop will have your item ready to collect." });
}
