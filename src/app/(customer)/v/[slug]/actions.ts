"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BookingError, createBooking } from "@/lib/bookings";
import { db } from "@/lib/db";
import { back, str } from "@/lib/http";
import { splitServiceChoice } from "@/lib/walk-in";

export async function joinQueue(form: FormData) {
  const user = await requireUser();
  const vendorId = str(form, "vendorId");
  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) redirect("/discover");
  const staffId = str(form, "staffId");
  const date = str(form, "date");
  const here = date ? `/v/${vendor.slug}/book?service=${encodeURIComponent(str(form, "service"))}&date=${date}` : `/v/${vendor.slug}`;
  let bookingId = "";
  let needsPayment = false;
  try {
    const b = await createBooking(user, {
      vendorId,
      ...splitServiceChoice(str(form, "service")),
      staffId: staffId && staffId !== "any" ? staffId : null,
      extraIds: form.getAll("extraIds").filter((v): v is string => typeof v === "string"),
      plate: str(form, "plate"),
      item: str(form, "item"),
      date: date || undefined,
      slot: str(form, "slot") || undefined,
    });
    bookingId = b.id;
    needsPayment = b.status === "PENDING_PAYMENT";
  } catch (e) {
    if (e instanceof BookingError) back(here, { error: e.message });
    throw e;
  }
  redirect(needsPayment ? `/bookings/${bookingId}/pay` : `/bookings/${bookingId}`);
}
