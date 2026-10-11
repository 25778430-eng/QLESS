"use server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/notify";
import { appUrl, back, str } from "@/lib/http";

export async function approveVendor(form: FormData) {
  await requireAdmin();
  const v = await db.vendor.update({ where: { id: str(form, "id") }, data: { status: "APPROVED", rejectReason: null } });
  await sendSms(v.phone, `Qless: ${v.name} is approved and live. Open ${appUrl()}/vendor to start your first queue and print your QR poster.`);
  back("/admin", { notice: `${v.name} is now live.` });
}

export async function rejectVendor(form: FormData) {
  await requireAdmin();
  const reason = str(form, "reason");
  if (!reason) back("/admin", { error: "Give a reason so the vendor knows what to fix." });
  const v = await db.vendor.update({ where: { id: str(form, "id") }, data: { status: "REJECTED", rejectReason: reason } });
  await sendSms(v.phone, `Qless: we couldn't approve ${v.name}. Reason: ${reason}. Reply or contact support to try again.`);
  back("/admin", { notice: `Rejected. ${v.name} got an SMS with the reason.` });
}
