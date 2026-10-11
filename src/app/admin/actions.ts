"use server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/notify";
import { appUrl, back, str } from "@/lib/http";
import { parseFeeRand } from "@/lib/fees";
import { MAX_PLAN_CENTS } from "@/lib/plans";
import { getSettings } from "@/lib/settings";
import { rand } from "@/lib/format";

export async function approveVendor(form: FormData) {
  await requireAdmin();
  const v = await db.vendor.update({ where: { id: str(form, "id") }, data: { status: "APPROVED", rejectReason: null, approvedAt: new Date() } });
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

export async function saveBookingFee(form: FormData) {
  await requireAdmin();
  const cents = parseFeeRand(str(form, "fee"));
  if (cents === null) back("/admin", { error: "Enter a booking fee between R0 and R50." });
  const on = form.get("on") === "on";
  await db.setting.upsert({
    where: { id: "global" },
    create: { id: "global", bookingFeeOn: on, bookingFeeCents: cents },
    update: { bookingFeeOn: on, bookingFeeCents: cents },
  });
  back("/admin", { notice: on ? `Booking fee is on: customers pay ${rand(cents)} per new booking.` : "Booking fee is off." });
}

export async function savePlan(form: FormData) {
  await requireAdmin();
  const cents = parseFeeRand(str(form, "price"), MAX_PLAN_CENTS);
  if (cents === null || cents === 0) back("/admin", { error: `Enter a monthly price between R1 and ${rand(MAX_PLAN_CENTS)}.` });
  const trialDays = Math.round(Number(str(form, "trial")));
  if (!(trialDays >= 0 && trialDays <= 90)) back("/admin", { error: "Free trial must be 0 to 90 days." });
  const on = form.get("on") === "on";
  const current = await getSettings();
  // Switching on starts everyone's free trial from today.
  const planOnSince = on && !current.planOn ? new Date() : current.planOnSince;
  await db.setting.update({ where: { id: "global" }, data: { planOn: on, planPriceCents: cents, planTrialDays: trialDays, planOnSince } });
  back("/admin", {
    notice: on ? `Monthly plan is on: ${rand(cents)} a month after a ${trialDays}-day free trial.` : "Monthly plan is off. All approved shops are listed.",
  });
}

export async function setPlanWaived(form: FormData) {
  await requireAdmin();
  const waived = str(form, "waived") === "1";
  const v = await db.vendor.update({ where: { id: str(form, "id") }, data: { planWaived: waived } });
  back("/admin?show=all", { notice: waived ? `${v.name} no longer needs a monthly plan.` : `${v.name} needs a monthly plan again.` });
}

export async function saveFeatured(form: FormData) {
  await requireAdmin();
  const featured = form.get("featured") === "on";
  const rank = Math.round(Number(str(form, "rank") || "0"));
  if (!(rank >= 0 && rank <= 100)) back("/admin?show=all", { error: "Rank must be 0 to 100." });
  const until = str(form, "until");
  if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) back("/admin?show=all", { error: "Pick a valid end date." });
  const v = await db.vendor.update({
    where: { id: str(form, "id") },
    // The listing stays featured through the end of the chosen day, South African time.
    data: { featured, featuredRank: rank, featuredUntil: until ? new Date(`${until}T23:59:59+02:00`) : null },
  });
  back("/admin?show=all", { notice: featured ? `${v.name} is featured${until ? ` until ${until}` : ""}.` : `${v.name} is no longer featured.` });
}
