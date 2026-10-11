// Vendor monthly plan and featured listings. Pure rules, no database access.

export const DEFAULT_PLAN_CENTS = 14900;
export const MAX_PLAN_CENTS = 200000;
const DAY = 24 * 60 * 60 * 1000;

export type PlanSetting = { planOn: boolean; planOnSince: Date | null; planPriceCents: number; planTrialDays: number };
export type PlanVendor = { createdAt: Date; approvedAt: Date | null; planWaived: boolean; planPaidUntil: Date | null };
export type PlanState =
  | { kind: "OFF" }
  | { kind: "WAIVED" }
  | { kind: "ACTIVE"; until: Date }
  | { kind: "TRIAL"; until: Date }
  | { kind: "EXPIRED"; since: Date };

/** Free trial ends this many days after the later of approval and the day the plan was switched on. */
export function trialEnds(v: PlanVendor, s: PlanSetting): Date {
  const start = Math.max((v.approvedAt ?? v.createdAt).getTime(), s.planOnSince?.getTime() ?? 0);
  return new Date(start + s.planTrialDays * DAY);
}

export function planState(v: PlanVendor, s: PlanSetting, now = new Date()): PlanState {
  if (!s.planOn) return { kind: "OFF" };
  if (v.planWaived) return { kind: "WAIVED" };
  if (v.planPaidUntil && v.planPaidUntil > now) return { kind: "ACTIVE", until: v.planPaidUntil };
  const trial = trialEnds(v, s);
  if (trial > now) return { kind: "TRIAL", until: trial };
  return { kind: "EXPIRED", since: v.planPaidUntil && v.planPaidUntil > trial ? v.planPaidUntil : trial };
}

/** Whether customers can find and book the shop under the plan rules. */
export function planAllowsListing(state: PlanState): boolean {
  return state.kind !== "EXPIRED";
}

/** Each payment covers a month plus 3 days' grace, so a late debit order doesn't hide the shop. */
export function paidUntilAfterPayment(current: Date | null, now = new Date()): Date {
  const from = current && current > now ? current : now;
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return new Date(d.getTime() + 3 * DAY);
}

export type FeaturedVendor = { featured: boolean; featuredRank: number; featuredUntil: Date | null };

export function isFeatured(v: FeaturedVendor, now = new Date()): boolean {
  return v.featured && (!v.featuredUntil || v.featuredUntil > now);
}

/** Sort key: featured shops first, higher rank first; others keep their order. */
export function featuredOrder(a: FeaturedVendor, b: FeaturedVendor, now = new Date()): number {
  const fa = isFeatured(a, now), fb = isFeatured(b, now);
  if (fa !== fb) return fa ? -1 : 1;
  return fa ? b.featuredRank - a.featuredRank : 0;
}
