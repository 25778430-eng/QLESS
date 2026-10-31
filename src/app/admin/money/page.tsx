import { requireAdmin, requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { vendorBalance, dayKey, depositsByVendor, lastDays, lastMonths, monthKey, sumTotals, totalsBy, type IncomeLine, type Totals } from "@/lib/money";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { recordPayout } from "../actions";

export const dynamic = "force-dynamic";

const MONTHS = 12;
const DAYS = 30;

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y!, m! - 1, 1)));
}

function dayLabel(key: string): string {
  return new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
}

function TotalsTable({ rows, label }: { rows: Array<[string, Totals]>; label: (k: string) => string }) {
  const sum = sumTotals(rows);
  return (
    <div className="card" style={{ overflowX: "auto", padding: "8px 14px" }}>
      <table className="small" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr className="muted" style={{ textAlign: "right" }}>
            <th style={{ textAlign: "left" }}></th><th>Fees</th><th>Plans</th><th>Featured</th><th>Total</th>
          </tr>
        </thead>
        <tbody className="mono" style={{ textAlign: "right" }}>
          {rows.map(([k, t]) => (
            <tr key={k} className={t.total ? "" : "muted"}>
              <td style={{ textAlign: "left", fontFamily: "inherit" }}>{label(k)}</td>
              <td>{rand(t.fee)}</td><td>{rand(t.plan)}</td><td>{rand(t.featured)}</td><td><b>{rand(t.total)}</b></td>
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid var(--line)" }}>
            <td style={{ textAlign: "left" }}><b>Total</b></td>
            <td>{rand(sum.fee)}</td><td>{rand(sum.plan)}</td><td>{rand(sum.featured)}</td><td><b>{rand(sum.total)}</b></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function Money({ searchParams }: { searchParams: { month?: string; error?: string; notice?: string } }) {
  await requireAdmin();
  const now = new Date();
  const months = lastMonths(MONTHS, now);
  const days = lastDays(DAYS, now);
  await requireSuperAdmin(); // Money is for super admins only
  const oldest = months[months.length - 1]!;
  const since = new Date(`${oldest}-01T00:00:00+02:00`);

  const [fees, income] = await Promise.all([
    db.booking.findMany({
      where: { feeCents: { gt: 0 }, payfastPaymentId: { not: null }, createdAt: { gte: since } },
      select: { createdAt: true, feeCents: true },
    }),
    db.income.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, kind: true, amountCents: true } }),
  ]);
  const lines: IncomeLine[] = [
    ...fees.map((b) => ({ at: b.createdAt, kind: "FEE" as const, cents: b.feeCents })),
    ...income.map((i) => ({ at: i.createdAt, kind: i.kind, cents: i.amountCents })),
  ];
  const byMonth = totalsBy(lines, monthKey, months);
  const byDay = totalsBy(lines, dayKey, days);
  const thisMonth = byMonth[0]![1];

  // Deposits for the chosen month, per vendor.
  const month = months.includes(searchParams.month ?? "") ? searchParams.month! : months[0]!;
  const [y, m] = month.split("-").map(Number);
  const start = new Date(`${month}-01T00:00:00+02:00`);
  const end = new Date(`${new Date(Date.UTC(y!, m!, 1)).toISOString().slice(0, 7)}-01T00:00:00+02:00`);
  const deposits = await db.booking.findMany({
    where: { OR: [{ depositCents: { gt: 0 } }, { restPaidCents: { gt: 0 } }], createdAt: { gte: start, lt: end } },
    select: { vendorId: true, depositCents: true, depositStatus: true, restPaidCents: true },
  });
  const perVendor = depositsByVendor(deposits);
  const vendors = await db.vendor.findMany({ where: { id: { in: [...perVendor.keys()] } }, select: { id: true, name: true } });
  const vendorRows = vendors
    .map((v) => ({ v, d: perVendor.get(v.id)! }))
    .sort((a, b) => b.d.owed - a.d.owed);
  const owedTotal = vendorRows.reduce((s, r) => s + r.d.owed, 0);

  // All-time balance per shop for payouts.
  const [allDeposits, allPayouts] = await Promise.all([
    db.booking.findMany({ where: { OR: [{ depositCents: { gt: 0 }, depositStatus: { in: ["APPLIED", "FORFEITED"] } }, { restPaidCents: { gt: 0 } }] }, select: { vendorId: true, depositCents: true, depositStatus: true, restPaidCents: true } }),
    db.payout.groupBy({ by: ["vendorId"], _sum: { amountCents: true } }),
  ]);
  const paidBy = new Map(allPayouts.map((p) => [p.vendorId, p._sum.amountCents ?? 0]));
  const byShop = new Map<string, typeof allDeposits>();
  for (const d of allDeposits) byShop.set(d.vendorId, [...(byShop.get(d.vendorId) ?? []), d]);
  const dueVendors = await db.vendor.findMany({ where: { id: { in: [...byShop.keys()] } }, select: { id: true, name: true, bankName: true, bankAccountNo: true } });
  const dueRows = dueVendors
    .map((v) => ({ v, b: vendorBalance(byShop.get(v.id)!, [paidBy.get(v.id) ?? 0]) }))
    .filter((r) => r.b.due > 0)
    .sort((a, b) => b.b.due - a.b.due);

  return (
    <>
      <AdminHeader current="/admin/money" />
      <main className="main wide">
        <h1>Money</h1>
        <Messages searchParams={searchParams} />
        <div className="stat">
          <div><b className="mono" style={{ fontSize: 20 }}>{rand(thisMonth.total)}</b><span>Qless income this month</span></div>
          <div><b className="mono" style={{ fontSize: 20 }}>{rand(thisMonth.fee)}</b><span>Booking fees</span></div>
          <div><b className="mono" style={{ fontSize: 20 }}>{rand(thisMonth.plan + thisMonth.featured)}</b><span>Plans and featured</span></div>
        </div>

        <h2>By month</h2>
        <TotalsTable rows={byMonth} label={monthLabel} />

        <h2>Last {DAYS} days</h2>
        <TotalsTable rows={byDay} label={dayLabel} />

        <h2>Pay out to shops</h2>
        <div className="list">
          {dueRows.length === 0 && <div className="li"><span className="small muted">Nothing due.</span></div>}
          {dueRows.map(({ v, b }) => (
            <details key={v.id} className="li" style={{ display: "block" }}>
              <summary className="row between" style={{ listStyle: "none" }}>
                <span className="grow"><b>{v.name}</b><span>{v.bankAccountNo ? `${v.bankName} ····${v.bankAccountNo.slice(-4)}` : "No bank details yet"} · paid {rand(b.paidOut)} so far</span></span>
                <b className="mono">{rand(b.due)}</b>
              </summary>
              <form action={recordPayout} className="row wrap" style={{ marginTop: 10 }}>
                <input type="hidden" name="vendorId" value={v.id} />
                <input type="hidden" name="month" value={month} />
                <input className="i mono" name="amount" defaultValue={(b.due / 100).toFixed(2)} style={{ width: 120 }} aria-label="Amount paid (R)" />
                <input className="i grow" name="reference" placeholder="EFT reference" />
                <button className="btn sm">Record payout</button>
              </form>
            </details>
          ))}
        </div>

        <h2>Deposits owed to vendors</h2>
        <form className="row" action="/admin/money">
          <select className="i grow" name="month" defaultValue={month}>
            {months.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
          </select>
          <button className="btn sm">Show</button>
        </form>
        <div className="card" style={{ overflowX: "auto", padding: "8px 14px" }}>
          {vendorRows.length === 0 ? (
            <p className="small muted">No deposits in {monthLabel(month)}.</p>
          ) : (
            <table className="small" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr className="muted" style={{ textAlign: "right" }}><th style={{ textAlign: "left" }}>Shop</th><th>Owed</th><th>Still held</th><th>Refunded</th></tr>
              </thead>
              <tbody className="mono" style={{ textAlign: "right" }}>
                {vendorRows.map(({ v, d }) => (
                  <tr key={v.id}>
                    <td style={{ textAlign: "left", fontFamily: "inherit" }}>{v.name}</td>
                    <td><b>{rand(d.owed)}</b></td><td>{rand(d.held)}</td><td>{rand(d.refunded)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ textAlign: "left" }}><b>Total</b></td><td><b>{rand(owedTotal)}</b></td><td></td><td></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
