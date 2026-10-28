import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand, sastDate, TZ } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Summary(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams;
  const { vendor } = await requireVendor();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? searchParams.date! : sastDate();
  const day = await db.queueDay.findUnique({ where: { vendorId_date: { vendorId: vendor.id, date } } });
  const bookings = day
    ? await db.booking.findMany({ where: { queueDayId: day.id }, include: { staff: true, review: true } })
    : [];
  const done = bookings.filter((b) => b.status === "DONE");
  const noShows = bookings.filter((b) => b.status === "NO_SHOW");
  const walkIns = bookings.filter((b) => b.isWalkIn);
  const sum = (xs: typeof bookings, f: (b: (typeof bookings)[number]) => number) => xs.reduce((s, b) => s + f(b), 0);
  const takings = sum(done, (b) => b.priceCents);
  const kept = sum(bookings.filter((b) => b.depositStatus === "FORFEITED"), (b) => b.depositCents);
  const refunded = sum(bookings.filter((b) => b.depositStatus === "REFUNDED" || b.depositStatus === "REFUND_PENDING"), (b) => b.depositCents);
  const collected = sum(bookings.filter((b) => ["PAID", "APPLIED", "FORFEITED"].includes(b.depositStatus)), (b) => b.depositCents);

  const hourOf = (d: Date) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d));
  const hours = new Map<number, number>();
  for (const b of done) {
    const h = hourOf(b.startedAt ?? b.completedAt ?? b.createdAt);
    hours.set(h, (hours.get(h) ?? 0) + 1);
  }
  const open = Number(vendor.openTime.slice(0, 2));
  const close = Number(vendor.closeTime.slice(0, 2));
  const hourRows = Array.from({ length: Math.max(1, close - open) }, (_, i) => [open + i, hours.get(open + i) ?? 0] as const);
  const peak = Math.max(1, ...hourRows.map(([, n]) => n));

  const byStaff = new Map<string, { name: string; count: number; takings: number; ratings: number[] }>();
  for (const b of done) {
    const key = b.staff?.id ?? "none";
    const row = byStaff.get(key) ?? { name: b.staff?.name ?? "Unassigned", count: 0, takings: 0, ratings: [] };
    row.count++;
    row.takings += b.priceCents;
    if (b.review) row.ratings.push(b.review.rating);
    byStaff.set(key, row);
  }

  const prev = new Date(date + "T12:00:00Z");
  prev.setUTCDate(prev.getUTCDate() - 1);
  const next = new Date(date + "T12:00:00Z");
  next.setUTCDate(next.getUTCDate() + 1);
  const label = new Intl.DateTimeFormat("en-ZA", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(date + "T12:00:00Z"));

  return (
    <main className="main">
      <h1>Daily summary</h1>
      <div className="row between">
        <Link className="btn sm alt" href={`/vendor/summary?date=${prev.toISOString().slice(0, 10)}`}>‹ Prev</Link>
        <span className="muted">{label}</span>
        {date < sastDate() ? <Link className="btn sm alt" href={`/vendor/summary?date=${next.toISOString().slice(0, 10)}`}>Next ›</Link> : <span style={{ width: 60 }} />}
      </div>
      {!day ? (
        <p className="muted">No queue on this day.</p>
      ) : (
        <>
          <div className="stat">
            <div><b>{done.length}</b><span>served</span></div>
            <div><b>{noShows.length}</b><span>no-shows</span></div>
            <div><b>{walkIns.length}</b><span>walk-ins</span></div>
          </div>
          <div className="card stack">
            <div className="row between"><span>Takings from services</span><b className="mono">{rand(takings)}</b></div>
            <div className="row between"><span>Deposits collected</span><b className="mono">{rand(collected)}</b></div>
            <div className="row between"><span>Deposits kept (no-shows and late cancels)</span><b className="mono">{rand(kept)}</b></div>
            <div className="row between"><span>Deposits refunded</span><b className="mono">{rand(refunded)}</b></div>
            <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}><b>Paid at the shop</b><b className="mono">{rand(takings - sum(done, (b) => (b.depositStatus === "APPLIED" ? b.depositCents : 0)))}</b></div>
          </div>
          <h3>Customers by hour</h3>
          <div className="bars">
            {hourRows.map(([h, n]) => (
              <div key={h}><b>{n}</b><i className={n === peak && n > 0 ? "peak" : ""} style={{ height: `${(n / peak) * 80}%` }} /><span>{h}</span></div>
            ))}
          </div>
          <h3>By staff member</h3>
          <div className="card" style={{ padding: "4px 14px" }}>
            {byStaff.size === 0 && <p className="muted" style={{ padding: "10px 0" }}>Nobody served yet.</p>}
            {[...byStaff.values()].map((s) => (
              <div className="svc" key={s.name}>
                <span><b>{s.name}</b><br /><span className="small muted">{s.count} customers{s.ratings.length ? ` · ★ ${(s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1)}` : ""}</span></span>
                <span className="p">{rand(s.takings)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
