import { describe, expect, it } from "vitest";
import { depositsByVendor, lastDays, lastMonths, monthKey, dayKey, sumTotals, totalsBy, vendorBalance } from "./money";

describe("totalsBy", () => {
  it("groups income by South African day, including late-night UTC payments", () => {
    const lines = [
      { at: new Date("2026-10-10T23:30:00Z"), kind: "FEE" as const, cents: 500 }, // 11 Oct in SA
      { at: new Date("2026-10-11T08:00:00Z"), kind: "PLAN" as const, cents: 14900 },
      { at: new Date("2026-10-11T09:00:00Z"), kind: "FEATURED" as const, cents: 10000 },
      { at: new Date("2026-09-01T09:00:00Z"), kind: "FEE" as const, cents: 500 }, // outside the keys
    ];
    const rows = totalsBy(lines, dayKey, ["2026-10-11", "2026-10-10"]);
    expect(rows[0]).toEqual(["2026-10-11", { fee: 500, plan: 14900, featured: 10000, total: 25400 }]);
    expect(rows[1]![1].total).toBe(0);
    expect(sumTotals(rows).total).toBe(25400);
    expect(totalsBy(lines, monthKey, ["2026-10", "2026-09"]).map(([, t]) => t.total)).toEqual([25400, 500]);
  });
});

describe("periods", () => {
  it("lists recent days and months newest first", () => {
    const now = new Date("2026-01-01T10:00:00Z");
    expect(lastDays(2, now)).toEqual(["2026-01-01", "2025-12-31"]);
    expect(lastMonths(3, now)).toEqual(["2026-01", "2025-12", "2025-11"]);
  });
});

describe("depositsByVendor", () => {
  it("owes applied and kept deposits, holds paid ones, and skips refunds and unpaid", () => {
    const m = depositsByVendor([
      { vendorId: "a", depositCents: 5000, depositStatus: "APPLIED" },
      { vendorId: "a", depositCents: 5000, depositStatus: "FORFEITED" },
      { vendorId: "a", depositCents: 5000, depositStatus: "PAID" },
      { vendorId: "a", depositCents: 5000, depositStatus: "REFUNDED" },
      { vendorId: "b", depositCents: 5000, depositStatus: "NONE" },
    ]);
    expect(m.get("a")).toEqual({ owed: 10000, held: 5000, refunded: 5000 });
    expect(m.has("b")).toBe(false);
  });
});

describe("vendor balance", () => {
  it("takes payouts off what is owed", () => {
    const rows = [
      { vendorId: "v", depositCents: 5000, depositStatus: "APPLIED" },
      { vendorId: "v", depositCents: 5000, depositStatus: "FORFEITED" },
      { vendorId: "v", depositCents: 5000, depositStatus: "PAID" },
      { vendorId: "v", depositCents: 5000, depositStatus: "REFUNDED" },
    ];
    expect(vendorBalance(rows, [3000])).toEqual({ owed: 10000, held: 5000, refunded: 5000, paidOut: 3000, due: 7000 });
    expect(vendorBalance([], [])).toEqual({ owed: 0, held: 0, refunded: 0, paidOut: 0, due: 0 });
  });
});

describe("rest paid in the app", () => {
  it("counts as owed to the shop, on top of the deposit", () => {
    const m = depositsByVendor([
      { vendorId: "v", depositCents: 5000, depositStatus: "APPLIED", restPaidCents: 10000 },
      { vendorId: "v", depositCents: 0, depositStatus: "NONE", restPaidCents: 8000 },
    ]);
    expect(m.get("v")?.owed).toBe(23000);
  });
});
