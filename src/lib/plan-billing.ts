import "server-only";
import type { Vendor } from "@prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { paidUntilAfterPayment, planAllowsListing, planState, type PlanState } from "./plans";

export async function vendorPlan(vendor: Vendor): Promise<PlanState> {
  return planState(vendor, await getSettings());
}

/** Whether customers can find and book this vendor right now (approved and plan in order). */
export async function vendorListed(vendor: Vendor): Promise<boolean> {
  return vendor.status === "APPROVED" && planAllowsListing(await vendorPlan(vendor));
}

/** Applies a plan ITN: each COMPLETE payment extends the plan by a month; CANCELLED clears the token. */
export async function recordPlanPayment(vendorId: string, status: string, paidCents: number, token: string): Promise<"OK" | string> {
  const vendor = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) return "Unknown vendor";
  if (status === "CANCELLED") {
    await db.vendor.update({ where: { id: vendor.id }, data: { planToken: null } });
    return "OK";
  }
  if (status !== "COMPLETE") return "OK";
  // A renewal on an existing subscription may still be at the price the vendor signed up at;
  // anything else must pay at least today's price.
  const renewal = !!token && token === vendor.planToken && paidCents === vendor.planAmountCents;
  if (!renewal && paidCents < (await getSettings()).planPriceCents) {
    console.error("[payfast] plan amount too low", vendor.id, paidCents);
    return "Amount mismatch";
  }
  await db.vendor.update({
    where: { id: vendor.id },
    data: { planPaidUntil: paidUntilAfterPayment(vendor.planPaidUntil), planToken: token || vendor.planToken, planAmountCents: paidCents },
  });
  return "OK";
}
