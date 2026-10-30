import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { aheadOf, loadQueue } from "@/lib/bookings";
import { distance, time } from "@/lib/format";
import { findShops, mapPins, parseShopQuery, typeChips } from "@/lib/discover";
import { getSettings } from "@/lib/settings";
import { hello, t } from "@/lib/i18n";
import { langFor } from "@/lib/lang";
import { typeInfo } from "@/lib/business-types";
import { firstName } from "@/lib/verification";
import { VendorMap } from "@/components/VendorMap";
import { LocateMe } from "@/components/LocateMe";
import { LowDataToggle } from "@/components/LowDataToggle";

export const dynamic = "force-dynamic";

type SP = { q?: string; cat?: string; lat?: string; lng?: string };

/** The customer's next live booking, for the ticket card at the top of Home. */
async function liveTicket(userId: string) {
  const b = await db.booking.findFirst({
    where: { customerId: userId, status: { in: ["PENDING_PAYMENT", "WAITING", "CALLED", "IN_SERVICE"] } },
    include: { vendor: true, queueDay: true },
    orderBy: { createdAt: "asc" },
  });
  if (!b) return null;
  const view = await loadQueue(b.queueDay);
  return { b, ahead: aheadOf(view, b.id), eta: view.etas.get(b.id) };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export default async function Home({ searchParams }: { searchParams: SP }) {
  const user = await currentUser();
  const lang = langFor(user);
  const lowData = user ? user.lowData : cookies().get("lowData")?.value === "1";
  const query = parseShopQuery(searchParams);
  const { q, cat, here } = query;
  const [rows, settings] = await Promise.all([findShops(query), getSettings()]);
  const ticket = user ? await liveTicket(user.id) : null;

  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...searchParams, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/discover?${p}`;
  };
  const search = (
    <form className="msearch" action="/discover">
      {here && <><input type="hidden" name="lat" value={here.lat} /><input type="hidden" name="lng" value={here.lng} /></>}
      {cat !== "All" && <input type="hidden" name="cat" value={cat} />}
      <svg viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
      <input name="q" defaultValue={q} placeholder={t(lang, "home.search")} aria-label={t(lang, "home.search")} />
      <button className="btn sm">{t(lang, "home.go")}</button>
    </form>
  );
  const chips = (
    <div className="chips scroll" role="group" aria-label="Type of business">
      {typeChips(settings.disabledTypes).map((c) => (
        <Link key={c.key} className="chip" aria-pressed={c.key === cat} href={qs({ cat: c.key === "All" ? undefined : c.key })}>{c.key === "All" ? t(lang, "home.all") : c.label}</Link>
      ))}
    </div>
  );

  return (
    <main className="main home">
      {lowData ? (
        <>
          <div className="hello"><small>{user ? `${hello(lang)},` : t(lang, "home.tagline")}</small>{user ? firstName(user.name) : t(lang, "home.find")}</div>
          {search}
          {chips}
        </>
      ) : (
        <div className="mapwrap">
          <VendorMap here={here} pins={mapPins(rows)} height={360} />
          <div className="mtop">
            {search}
            {chips}
          </div>
          {ticket && (
            <Link className="island" href={`/bookings/${ticket.b.id}`}>
              <span>{ticket.b.vendor.name}{ticket.b.ticketNo ? ` · ${ticket.b.ticketNo}` : ""}</span>
              <b>{ticket.b.status === "CALLED" ? "Go now" : ticket.b.status === "WAITING" ? t(lang, "home.ahead", { n: ticket.ahead }) : ticket.b.status === "PENDING_PAYMENT" ? "Pay" : "Now"}</b>
            </Link>
          )}
        </div>
      )}

      <div className={lowData ? "stack" : "msheet"}>
        {!lowData && <div className="grab" aria-hidden />}
        {ticket && lowData && (
          <Link className="stub dark" href={`/bookings/${ticket.b.id}`}>
            <span className="l"><span className="k">{t(lang, "home.yourTicket")} · {ticket.b.vendor.name}</span><span className="t">{ticket.b.status === "CALLED" ? "It's your turn" : t(lang, "home.ahead", { n: ticket.ahead })}</span></span>
            <span className="r"><span><b>{ticket.b.ticketNo ?? ordinal(ticket.ahead + 1)}</b><span>{ticket.eta ? time(ticket.eta) : ""}</span></span></span>
          </Link>
        )}
        <div className="row between">
          <h3>{here ? t(lang, "home.near") : t(lang, "home.places")}</h3>
          {!lowData && <Link className="small" href={`/map?${new URLSearchParams(Object.entries(searchParams).filter(([, v]) => v) as [string, string][])}`}><b>{t(lang, "home.seeMap")}</b></Link>}
        </div>
        {!here && <LocateMe />}
        {rows.length === 0 && <p className="muted">{t(lang, "home.none")}{q ? ` · "${q}"` : ""}</p>}
        {rows.map(({ v, km, rating, count, state, featured }) => (
          <Link key={v.id} className={`stub${state.kind === "bad" ? " off" : ""}`} href={`/v/${v.slug}`}>
            <span className="l">
              <span className="t">{v.name}{featured && <> <span className="pill sig">Featured</span></>}</span>
              <span className="s">
                {v.category}{km != null ? ` · ${distance(km)}` : ""}{count ? ` · ★ ${rating.toFixed(1)}` : " · New"}{v.level === "BASIC" && typeInfo(v.businessType).free === false ? " · Not verified" : ""}
              </span>
            </span>
            <span className="r">
              {state.kind === "" ? <span><b>{state.waiting}</b><span>{t(lang, "home.waiting")}</span></span> : <span><b>–</b><span>{state.label === "Full today" ? t(lang, "home.full") : t(lang, "home.closed")}</span></span>}
            </span>
          </Link>
        ))}
        <LowDataToggle on={lowData} signedIn={!!user} />
      </div>
    </main>
  );
}
