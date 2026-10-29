// Admin money dashboard: groups Qless income by South African day or month,
// and works out the deposits Qless holds for each vendor. Pure, no database access.
import { sastDate } from "./format";

export type IncomeLine = { at: Date; kind: "FEE" | "PLAN" | "FEATURED"; cents: number };
export type Totals = { fee: number; plan: number; featured: number; total: number };

export const dayKey = (d: Date) => sastDate(d);
export const monthKey = (d: Date) => sastDate(d).slice(0, 7);

const empty = (): Totals => ({ fee: 0, plan: 0, featured: 0, total: 0 });

/** Totals per key (day or month), for the keys given, in that order. Keys with no income are zero. */
export function totalsBy(lines: IncomeLine[], key: (d: Date) => string, keys: string[]): Array<[string, Totals]> {
  const out = new Map(keys.map((k) => [k, empty()]));
  for (const l of lines) {
    const t = out.get(key(l.at));
    if (!t) continue;
    if (l.kind === "FEE") t.fee += l.cents;
    else if (l.kind === "PLAN") t.plan += l.cents;
    else t.featured += l.cents;
    t.total += l.cents;
  }
  return [...out.entries()];
}

export function sumTotals(rows: Array<[string, Totals]>): Totals {
  return rows.reduce((s, [, t]) => ({ fee: s.fee + t.fee, plan: s.plan + t.plan, featured: s.featured + t.featured, total: s.total + t.total }), empty());
}

/** The last n South African days, newest first, as YYYY-MM-DD. */
export function lastDays(n: number, now = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => dayKey(new Date(now.getTime() - i * 86_400_000)));
}

/** The last n months, newest first, as YYYY-MM. */
export function lastMonths(n: number, now = new Date()): string[] {
  const [y, m] = monthKey(now).split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y!, m! - 1 - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export type DepositRow = { vendorId: string; depositCents: number; depositStatus: string };
export type VendorDeposits = { owed: number; held: number; refunded: number };

/**
 * Deposits are paid into the Qless PayFast account. Qless owes the vendor every deposit that was
 * applied to a visit (the customer paid that much less at the shop) or kept for a no-show or late cancel.
 * Deposits still waiting on a visit are held; refunded ones went back to the customer.
 */
export function depositsByVendor(rows: DepositRow[]): Map<string, VendorDeposits> {
  const out = new Map<string, VendorDeposits>();
  for (const r of rows) {
    const v = out.get(r.vendorId) ?? { owed: 0, held: 0, refunded: 0 };
    if (r.depositStatus === "APPLIED" || r.depositStatus === "FORFEITED") v.owed += r.depositCents;
    else if (r.depositStatus === "PAID") v.held += r.depositCents;
    else if (r.depositStatus === "REFUNDED" || r.depositStatus === "REFUND_PENDING") v.refunded += r.depositCents;
    else continue;
    out.set(r.vendorId, v);
  }
  return out;
}

export type Balance = VendorDeposits & { paidOut: number; due: number };

/** What Qless still has to pay a vendor: deposits owed over all time, less payouts already made. */
export function vendorBalance(rows: DepositRow[], payoutsCents: number[]): Balance {
  const d = depositsByVendor(rows).get(rows[0]?.vendorId ?? "") ?? { owed: 0, held: 0, refunded: 0 };
  const paidOut = payoutsCents.reduce((s, c) => s + c, 0);
  return { ...d, paidOut, due: Math.max(0, d.owed - paidOut) };
}
