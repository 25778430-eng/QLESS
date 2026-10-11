import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { dayKey, depositsByVendor, lastDays, lastMonths, monthKey, sumTotals, totalsBy, type IncomeLine, type Totals } from "@/lib/money";
import { AdminHeader } from "@/components/AdminHeader";

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

export default async function Money({ searchParams }: { searchParams: { month?: string } }) {
  await requireAdmin();
  const now = new Date();
  const months = lastMonths(MONTHS, now);
  const days = lastDays(DAYS, now);
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
    where: { depositCents: { gt: 0 }, createdAt: { gte: start, lt: end } },
    select: { vendorId: true, depositCents: true, depositStatus: true },
  });
  const perVendor = depositsByVendor(deposits);
  const vendors = await db.vendor.findMany({ where: { id: { in: [...perVendor.keys()] } }, select: { id: true, name: true } });
  const vendorRows = vendors
    .map((v) => ({ v, d: perVendor.get(v.id)! }))
    .sort((a, b) => b.d.owed - a.d.owed);
  const owedTotal = vendorRows.reduce((s, r) => s + r.d.owed, 0);

  return (
    <>
      <AdminHeader current="/admin/money" />
      <main className="main">
        <h1>Money</h1>
        <div className="stat">
          <div><b className="mono" style={{ fontSize: 20 }}>{rand(thisMonth.total)}</b><span>Qless income this month</span></div>
          <div><b className="mono" style={{ fontSize: 20 }}>{rand(thisMonth.fee)}</b><span>Booking fees</span></div>
          <div><b className="mono" style={{ fontSize: 20 }}>{rand(thisMonth.plan + thisMonth.featured)}</b><span>Plans and featured</span></div>
        </div>

        <h2>By month</h2>
        <TotalsTable rows={byMonth} label={monthLabel} />

        <h2>Last {DAYS} days</h2>
        <TotalsTable rows={byDay} label={dayLabel} />

        <h2>Deposits owed to vendors</h2>
        <p className="small muted">
          Deposits are paid into the Qless PayFast account. You owe each shop the deposits that came off a customer&apos;s bill and the ones kept for no-shows or late cancels. &quot;Still held&quot; are deposits for visits that haven&apos;t happened yet. Counted by the day the booking was made.
        </p>
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
