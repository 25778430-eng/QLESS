"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BookingError, createBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { back, str } from "@/lib/http";

export async function joinQueue(form: FormData) {
  const user = await requireUser();
  const vendorId = str(form, "vendorId");
  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) redirect("/discover");
  const staffId = str(form, "staffId");
  let bookingId = "";
  let needsPayment = false;
  try {
    const b = await createBooking(user, vendorId, str(form, "serviceId"), staffId && staffId !== "any" ? staffId : null);
    bookingId = b.id;
    needsPayment = b.status === "PENDING_PAYMENT";
  } catch (e) {
    if (e instanceof BookingError) back(`/v/${vendor.slug}`, { error: e.message });
    throw e;
  }
  redirect(needsPayment ? `/bookings/${bookingId}/pay` : `/bookings/${bookingId}`);
}
