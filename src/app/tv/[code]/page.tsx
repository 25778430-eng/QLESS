import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { loadQueue, todayQueue } from "@/lib/bookings";
import { appUrl } from "@/lib/http";
import { sastClock } from "@/lib/format";
import { prettyShopCode } from "@/lib/shop-code";
import { stationName, typeInfo } from "@/lib/business-types";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

function sameKey(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Waiting-room screen: who's being served where, who's next, and a QR to join. Ticket numbers only, no names. */
export default async function Tv({ params, searchParams }: { params: { code: string }; searchParams: { k?: string } }) {
  const vendor = await db.vendor.findUnique({ where: { code: params.code.toUpperCase() } });
  if (!vendor?.tvKey || !sameKey(searchParams.k ?? "", vendor.tvKey)) notFound();
  const info = typeInfo(vendor.businessType);
  const day = await todayQueue(vendor.id);
  const view = day ? await loadQueue(day) : null;
  const staff = day ? await db.staff.findMany({ where: { id: { in: day.staffIds } } }) : [];
  const where = (staffId: string | null) => {
    const i = staffId ? day!.staffIds.indexOf(staffId) : -1;
    const s = staff.find((x) => x.id === staffId);
    return i >= 0 ? `${stationName(vendor.businessType, i + 1)}${s ? ` · ${s.name.split(" ")[0]}` : ""}` : "";
  };
  const serving = view?.bookings.filter((b) => b.status === "CALLED" || b.status === "IN_SERVICE") ?? [];
  const next = view?.bookings.filter((b) => b.status === "WAITING").sort((a, b) => (view.etas.get(a.id)?.getTime() ?? 0) - (view.etas.get(b.id)?.getTime() ?? 0)) ?? [];
  const qr = await QRCode.toDataURL(`${appUrl()}/v/${vendor.slug}`, { width: 300, margin: 1 });

  return (
    <main className="tv">
      <AutoRefresh seconds={10} />
      <header className="tv-head">
        <span className="qtile">Q</span>
        <b>{vendor.name}</b>
        <span className="tv-clock mono">{sastClock()}</span>
      </header>
      {!day || day.status === "CLOSED" ? (
        <div className="tv-closed">The queue is closed right now.</div>
      ) : (
        <div className="tv-grid">
          <section>
            <h2>Now serving</h2>
            {day.status === "PAUSED" && <div className="banner">Paused{day.pauseReason ? `: ${day.pauseReason.toLowerCase()}` : ""}. Back soon.</div>}
            {serving.length === 0 && <p className="tv-empty">Next ticket coming up…</p>}
            {serving.map((b) => (
              <div key={b.id} className={`tv-row ${b.status === "CALLED" ? "call" : ""}`}>
                <span className="tv-no">{b.ticketNo ?? b.ref}</span>
                <span>{b.status === "CALLED" ? `Go to ${where(b.staffId) || `the ${info.station}`}` : where(b.staffId)}</span>
              </div>
            ))}
          </section>
          <section>
            <h2>Next up</h2>
            {next.slice(0, 6).map((b) => (
              <div key={b.id} className="tv-row"><span className="tv-no">{b.ticketNo ?? b.ref}</span><span className="mono">{view!.etas.get(b.id) ? `~${sastClock(view!.etas.get(b.id)!)}` : ""}</span></div>
            ))}
            {next.length === 0 && <p className="tv-empty">Nobody waiting.</p>}
            <p className="tv-count">{next.length} waiting</p>
          </section>
          <aside className="tv-join">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Scan to join the queue" />
            <b>Scan to join</b>
            <span>or type <span className="mono">{prettyShopCode(vendor.code ?? "")}</span> in Qless</span>
          </aside>
        </div>
      )}
    </main>
  );
}
