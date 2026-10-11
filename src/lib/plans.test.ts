import { describe, expect, it } from "vitest";
import { featuredOrder, isFeatured, paidUntilAfterPayment, planAllowsListing, planState, trialEnds } from "./plans";

const d = (s: string) => new Date(s);
const on = { planOn: true, planOnSince: d("2026-11-01T00:00:00Z"), planPriceCents: 14900, planTrialDays: 14 };
const vendor = { createdAt: d("2026-10-01T00:00:00Z"), approvedAt: d("2026-10-02T00:00:00Z"), planWaived: false, planPaidUntil: null };

describe("planState", () => {
  it("is OFF while the plan is switched off", () => {
    expect(planState(vendor, { ...on, planOn: false }).kind).toBe("OFF");
  });
  it("gives existing vendors a trial from the day the plan was switched on", () => {
    expect(trialEnds(vendor, on)).toEqual(d("2026-11-15T00:00:00Z"));
    expect(planState(vendor, on, d("2026-11-10T00:00:00Z")).kind).toBe("TRIAL");
    expect(planState(vendor, on, d("2026-11-16T00:00:00Z")).kind).toBe("EXPIRED");
  });
  it("gives new vendors a trial from approval", () => {
    const v = { ...vendor, approvedAt: d("2026-12-01T00:00:00Z") };
    expect(trialEnds(v, on)).toEqual(d("2026-12-15T00:00:00Z"));
  });
  it("is ACTIVE while paid and WAIVED when the admin waives it", () => {
    const now = d("2026-12-01T00:00:00Z");
    expect(planState({ ...vendor, planPaidUntil: d("2026-12-20T00:00:00Z") }, on, now).kind).toBe("ACTIVE");
    expect(planState({ ...vendor, planWaived: true }, on, now).kind).toBe("WAIVED");
  });
  it("hides only expired shops", () => {
    expect(planAllowsListing(planState(vendor, on, d("2026-12-01T00:00:00Z")))).toBe(false);
    expect(planAllowsListing(planState(vendor, on, d("2026-11-01T00:00:00Z")))).toBe(true);
  });
});

describe("paidUntilAfterPayment", () => {
  it("adds a month and 3 days from now, or from the current end if still paid", () => {
    expect(paidUntilAfterPayment(null, d("2026-11-10T00:00:00Z"))).toEqual(d("2026-12-13T00:00:00Z"));
    expect(paidUntilAfterPayment(d("2026-12-13T00:00:00Z"), d("2026-12-10T00:00:00Z"))).toEqual(d("2027-01-16T00:00:00Z"));
  });
});

describe("featured", () => {
  const now = d("2026-11-01T00:00:00Z");
  const plain = { featured: false, featuredRank: 0, featuredUntil: null };
  it("ends on the end date", () => {
    expect(isFeatured({ featured: true, featuredRank: 0, featuredUntil: d("2026-10-31T00:00:00Z") }, now)).toBe(false);
    expect(isFeatured({ featured: true, featuredRank: 0, featuredUntil: null }, now)).toBe(true);
  });
  it("puts featured shops first, higher rank first, and keeps the rest in order", () => {
    const a = { featured: true, featuredRank: 1, featuredUntil: null };
    const b = { featured: true, featuredRank: 5, featuredUntil: null };
    const rows = [plain, a, { ...plain }, b].sort((x, y) => featuredOrder(x, y, now));
    expect(rows[0]).toBe(b);
    expect(rows[1]).toBe(a);
    expect(featuredOrder(plain, { ...plain }, now)).toBe(0);
  });
});
