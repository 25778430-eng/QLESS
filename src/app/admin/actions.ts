"use server";
import { isAdminPhone, isSuperAdmin, requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/notify";
import { appUrl, back, str } from "@/lib/http";
import { parseFeeRand } from "@/lib/fees";
import { MAX_PLAN_CENTS } from "@/lib/plans";
import { getSettings } from "@/lib/settings";
import { rand } from "@/lib/format";
import { DOC_LABEL } from "@/lib/verification";
import { TYPES, isBusinessType } from "@/lib/business-types";

export async function approveVendor(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const before = await db.vendor.findUnique({ where: { id } });
  if (!before) back("/admin/approvals", { error: "Vendor not found." });
  const upgrade = before.upgradeRequested;
  const now = new Date();
  const [v] = await db.$transaction([
    db.vendor.update({
      where: { id },
      data: upgrade
        ? { level: "VERIFIED", upgradeRequested: false }
        : { status: "APPROVED", rejectReason: null, approvedAt: now },
    }),
    db.document.updateMany({ where: { vendorId: id, status: "PENDING" }, data: { status: "APPROVED", reviewedAt: now } }),
  ]);
  await sendSms(
    v.phone,
    upgrade
      ? `Qless: ${v.name} is now Verified. You can set a deposit in ${appUrl()}/vendor/setup.`
      : `Qless: ${v.name} is approved and live. Open ${appUrl()}/vendor to start your first queue and print your QR poster.`,
  );
  back("/admin/approvals", { notice: upgrade ? `${v.name} is now Verified.` : `${v.name} is now live.` });
}

export async function rejectVendor(form: FormData) {
  await requireAdmin();
  const reason = str(form, "reason");
  if (!reason) back("/admin/approvals", { error: "Give a reason so the vendor knows what to fix." });
  const id = str(form, "id");
  const before = await db.vendor.findUnique({ where: { id } });
  if (!before) back("/admin/approvals", { error: "Vendor not found." });
  const now = new Date();
  // A declined upgrade leaves the shop live as Basic.
  const [v] = await db.$transaction([
    db.vendor.update({ where: { id }, data: before.upgradeRequested ? { upgradeRequested: false } : { status: "REJECTED", rejectReason: reason } }),
    db.document.updateMany({ where: { vendorId: id, status: "PENDING" }, data: { status: "REJECTED", note: reason, reviewedAt: now } }),
  ]);
  await sendSms(
    v.phone,
    before.upgradeRequested
      ? `Qless: we couldn't verify ${v.name} yet. Reason: ${reason}. You're still listed as Basic. Upload new documents at ${appUrl()}/vendor/documents.`
      : `Qless: we couldn't approve ${v.name}. Reason: ${reason}. Upload new documents at ${appUrl()}/vendor/documents or contact support.`,
  );
  back("/admin/approvals", { notice: `Declined. ${v.name} got an SMS with the reason.` });
}

/** Sends one document back without rejecting the whole application. */
export async function rejectDocument(form: FormData) {
  await requireAdmin();
  const note = str(form, "note") || "Please upload a clearer copy.";
  const d = await db.document.update({ where: { id: str(form, "id") }, data: { status: "REJECTED", note, reviewedAt: new Date() }, include: { vendor: true } });
  await sendSms(d.vendor.phone, `Qless: please upload your ${DOC_LABEL[d.kind].toLowerCase()} again. ${note} ${appUrl()}/vendor/documents`);
  back("/admin/approvals", { notice: `Asked ${d.vendor.name} to upload it again.` });
}

export async function saveSignupRules(form: FormData) {
  await requireSuperAdmin();
  const data = {
    allowBasic: form.get("allowBasic") === "on",
    requireCipc: form.get("requireCipc") === "on",
    requireAddress: form.get("requireAddress") === "on",
    requireBank: form.get("requireBank") === "on",
  };
  await getSettings();
  await db.setting.update({ where: { id: "global" }, data });
  back("/admin/rules", { notice: `Sign-up rules saved. CIPC is ${data.requireCipc ? "required" : "not required"} for new vendors.` });
}

export async function saveBookingFee(form: FormData) {
  await requireSuperAdmin();
  const cents = parseFeeRand(str(form, "fee"));
  if (cents === null) back("/admin/fee", { error: "Enter a booking fee between R0 and R50." });
  const on = form.get("on") === "on";
  await db.setting.upsert({
    where: { id: "global" },
    create: { id: "global", bookingFeeOn: on, bookingFeeCents: cents },
    update: { bookingFeeOn: on, bookingFeeCents: cents },
  });
  back("/admin/fee", { notice: on ? `Booking fee is on: customers pay ${rand(cents)} per new booking.` : "Booking fee is off." });
}

export async function savePlan(form: FormData) {
  await requireSuperAdmin();
  const cents = parseFeeRand(str(form, "price"), MAX_PLAN_CENTS);
  if (cents === null || cents === 0) back("/admin/plan", { error: `Enter a monthly price between R1 and ${rand(MAX_PLAN_CENTS)}.` });
  const trialDays = Math.round(Number(str(form, "trial")));
  if (!(trialDays >= 0 && trialDays <= 90)) back("/admin/plan", { error: "Free trial must be 0 to 90 days." });
  const on = form.get("on") === "on";
  const current = await getSettings();
  // Switching on starts everyone's free trial from today.
  const planOnSince = on && !current.planOn ? new Date() : current.planOnSince;
  await db.setting.update({ where: { id: "global" }, data: { planOn: on, planPriceCents: cents, planTrialDays: trialDays, planOnSince } });
  back("/admin/plan", {
    notice: on ? `Monthly plan is on: ${rand(cents)} a month after a ${trialDays}-day free trial.` : "Monthly plan is off. All approved shops are listed.",
  });
}

export async function savePayInApp(form: FormData) {
  await requireSuperAdmin();
  const on = form.get("on") === "on";
  await db.setting.update({ where: { id: "global" }, data: { payInAppOn: on } });
  back("/admin/pay-in-app", { notice: on ? "Pay in the app is on. Verified shops can switch it on for their clients." : "Pay in the app is off." });
}

export async function setPlanWaived(form: FormData) {
  await requireSuperAdmin();
  const waived = str(form, "waived") === "1";
  const v = await db.vendor.update({ where: { id: str(form, "id") }, data: { planWaived: waived } });
  back("/admin/shops", { notice: waived ? `${v.name} no longer needs a monthly plan.` : `${v.name} needs a monthly plan again.` });
}

export async function saveFeatured(form: FormData) {
  await requireSuperAdmin();
  const featured = form.get("featured") === "on";
  const rank = Math.round(Number(str(form, "rank") || "0"));
  if (!(rank >= 0 && rank <= 100)) back("/admin/shops", { error: "Rank must be 0 to 100." });
  const until = str(form, "until");
  if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) back("/admin/shops", { error: "Pick a valid end date." });
  const paid = str(form, "paid") ? parseFeeRand(str(form, "paid"), MAX_PLAN_CENTS) : 0;
  if (paid === null) back("/admin/shops", { error: `Amount paid must be between R0 and ${rand(MAX_PLAN_CENTS)}.` });
  const v = await db.vendor.update({
    where: { id: str(form, "id") },
    // The listing stays featured through the end of the chosen day, South African time.
    data: { featured, featuredRank: rank, featuredUntil: until ? new Date(`${until}T23:59:59+02:00`) : null },
  });
  if (paid > 0) {
    await db.income.create({ data: { kind: "FEATURED", vendorId: v.id, amountCents: paid, note: until ? `Featured until ${until}` : "Featured" } });
  }
  back("/admin/shops", { notice: featured ? `${v.name} is featured${until ? ` until ${until}` : ""}.` : `${v.name} is no longer featured.` });
}

export async function banUser(form: FormData) {
  const admin = await requireAdmin();
  const id = str(form, "id");
  const target = await db.user.findUnique({ where: { id } });
  if (!target) back("/admin/users", { error: "User not found." });
  // Only a super admin can block another admin, and super admins can't be blocked at all.
  if (target.id === admin.id || isSuperAdmin(target) || (target.role === "ADMIN" && !isSuperAdmin(admin))) {
    back(`/admin/users/${id}`, { error: "You can't block this admin." });
  }
  await db.$transaction([
    db.user.update({ where: { id }, data: { banned: true, bannedReason: str(form, "reason").slice(0, 200) || null } }),
    db.session.deleteMany({ where: { userId: id } }),
  ]);
  back(`/admin/users/${id}`, { notice: `${target.name} is blocked and signed out.` });
}

/**
 * Super admins only: removes a user for good. Their name, number and email are wiped, they can never sign in
 * again, and a shop they own is taken off Qless. Booking and payment records stay, without their details.
 */
export async function removeUser(form: FormData) {
  const admin = await requireSuperAdmin();
  const id = str(form, "id");
  const here = `/admin/users/${id}`;
  if (str(form, "confirm").toUpperCase() !== "REMOVE") back(here, { error: "Type REMOVE to confirm." });
  const target = await db.user.findUnique({ where: { id }, include: { vendor: { select: { id: true } } } });
  if (!target) back("/admin/users", { error: "User not found." });
  if (target.id === admin.id) back(here, { error: "You can't remove yourself." });
  if (isAdminPhone(target.phone)) back(here, { error: "This number is in ADMIN_PHONES on Vercel. Remove it there first." });
  const active = await db.booking.count({ where: { customerId: id, status: { in: ["PENDING_PAYMENT", "WAITING", "CALLED", "IN_SERVICE"] } } });
  if (active) back(here, { error: "They're in a queue right now. Wait until the booking is finished or cancelled." });
  await db.$transaction([
    db.session.deleteMany({ where: { userId: id } }),
    db.pushSubscription.deleteMany({ where: { userId: id } }),
    ...(target.vendor ? [db.vendor.update({ where: { id: target.vendor.id }, data: { status: "REJECTED", rejectReason: "Removed by Qless" } })] : []),
    db.user.update({
      where: { id },
      data: {
        name: "Removed user", email: null, phone: `removed:${id}`, role: target.vendor ? "VENDOR" : "CUSTOMER", superAdmin: false,
        banned: true, bannedReason: "Removed by a super admin", consentReminders: false, consentOffers: false, notifySms: false, notifyWhatsapp: false,
      },
    }),
  ]);
  back("/admin/users", { notice: `${target.name} has been removed${target.vendor ? " and their shop taken off Qless" : ""}.` });
}

export async function unbanUser(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const u = await db.user.update({ where: { id }, data: { banned: false, bannedReason: null } });
  back(`/admin/users/${id}`, { notice: `${u.name} is unblocked and can sign in again.` });
}

export async function liftNoShowBlock(form: FormData) {
  await requireAdmin();
  const id = str(form, "id");
  const u = await db.user.update({ where: { id }, data: { blockedUntil: null } });
  back(`/admin/users/${id}`, { notice: `${u.name} can book again.` });
}

export async function setTypeEnabled(form: FormData) {
  await requireSuperAdmin();
  const type = str(form, "type");
  if (!isBusinessType(type)) back("/admin/types", { error: "Unknown business type." });
  const on = str(form, "on") === "1";
  const current = await getSettings();
  const disabledTypes = on ? current.disabledTypes.filter((t) => t !== type) : [...new Set([...current.disabledTypes, type])];
  await db.setting.update({ where: { id: "global" }, data: { disabledTypes } });
  back("/admin/types", { notice: `${TYPES[type].label} is ${on ? "on. Those shops show in search and can sign up" : "off. Those shops are hidden and can't sign up"}.` });
}

/** Records money Qless paid into a vendor's bank for the deposits it collected. */
export async function recordPayout(form: FormData) {
  const me = await requireSuperAdmin();
  const vendorId = str(form, "vendorId");
  const back_ = `/admin/money?month=${encodeURIComponent(str(form, "month"))}`;
  const cents = parseFeeRand(str(form, "amount"), 100_000_000);
  if (!cents) back(back_, { error: "Enter the amount you paid." });
  const v = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!v) back(back_, { error: "Shop not found." });
  await db.payout.create({ data: { vendorId, amountCents: cents, reference: str(form, "reference").slice(0, 60), createdBy: me.id } });
  await sendSms(v.phone, `Qless: we've paid ${rand(cents)} into your bank account for deposits. See ${appUrl()}/vendor/payouts`);
  back(back_, { notice: `Payout of ${rand(cents)} to ${v.name} recorded. They were told by SMS.` });
}
