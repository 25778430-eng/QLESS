"use server";
import { redirect } from "next/navigation";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { back } from "@/lib/http";
import { cancelSubscription, payfastConfigured } from "@/lib/payfast";
import { recordPlanPayment } from "@/lib/plan-billing";
import { getSettings } from "@/lib/settings";

/** Development only: approves a plan payment without PayFast. */
export async function testSubscribeAction() {
  const { vendor } = await requireVendor();
  if (payfastConfigured() || process.env.NODE_ENV === "production") redirect("/vendor/plan");
  await recordPlanPayment(vendor.id, "COMPLETE", (await getSettings()).planPriceCents, `test-${vendor.id}`);
  back("/vendor/plan", { notice: "Test payment approved. Your plan is active." });
}

export async function cancelPlanAction() {
  const { vendor } = await requireVendor();
  const token = vendor.planToken;
  if (!token) back("/vendor/plan", { error: "You don't have a monthly plan to cancel." });
  const ok = token.startsWith("test-") || (await cancelSubscription(token));
  if (!ok) back("/vendor/plan", { error: "We couldn't cancel with PayFast right now. Please try again or contact Qless support." });
  await db.vendor.update({ where: { id: vendor.id }, data: { planToken: null } });
  back("/vendor/plan", { notice: "Your monthly plan is cancelled. You stay listed until the end of the period you've paid for." });
}
