import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser, staffFor } from "@/lib/auth";
import { inClientMode } from "@/lib/mode";
import { aheadOf, loadQueue } from "@/lib/bookings";
import { distance, time } from "@/lib/format";
import { findShops, parseShopQuery, typeChips } from "@/lib/discover";
import { getSettings } from "@/lib/settings";
import { hello, t } from "@/lib/i18n";
import { langFor } from "@/lib/lang";
import { typeInfo } from "@/lib/business-types";
import { firstName } from "@/lib/verification";
import { LocateMe } from "@/components/LocateMe";

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
  // Staff in staff mode only see their bay; they switch to client mode in Account to book elsewhere.
  if (user && !inClientMode() && (await staffFor(user)).length > 0) redirect("/staff");
  const lang = langFor(user);
  const query = parseShopQuery(searchParams);
  const { q, cat, here } = query;
  const [rows, settings] = await Promise.all([findShops(query), getSettings()]);
  const ticket = user ? await liveTicket(user.id) : null;

  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...searchParams, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/discover?${p}`;
  };
  // Search runs when the user presses Enter (Search / Go on the phone keyboard). Scan sits in the same bar.
  const search = (
    <form className="msearch" action="/discover" role="search">
      {here && <><input type="hidden" name="lat" value={here.lat} /><input type="hidden" name="lng" value={here.lng} /></>}
      {cat !== "All" && <input type="hidden" name="cat" value={cat} />}
      <svg viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
      <input type="search" name="q" defaultValue={q} placeholder={t(lang, "home.search")} aria-label={t(lang, "home.search")} enterKeyHint="search" autoComplete="off" />
      <Link className="scanbtn" href="/scan" aria-label="Scan a QR code or type a shop code">
        <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M4 12h16" /></svg>
      </Link>
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
    <main className="main app">
      <div className="hello"><small>{user ? `${hello(lang)},` : t(lang, "home.tagline")}</small>{user ? firstName(user.name) : t(lang, "home.find")}</div>
      {search}
      {chips}
      {ticket && (
        <Link className="stub dark" href={`/bookings/${ticket.b.id}`}>
          <span className="l"><span className="k">{t(lang, "home.yourTicket")} · {ticket.b.vendor.name}</span><span className="t">{ticket.b.status === "CALLED" ? "It's your turn" : ticket.b.status === "PENDING_PAYMENT" ? "Pay to hold your spot" : t(lang, "home.ahead", { n: ticket.ahead })}</span></span>
          <span className="r"><span><b>{ticket.b.ticketNo ?? ordinal(ticket.ahead + 1)}</b><span>{ticket.eta ? time(ticket.eta) : ""}</span></span></span>
        </Link>
      )}
      <h3>{here ? t(lang, "home.near") : t(lang, "home.places")}</h3>
      {!here && <LocateMe />}
      <div className="stack" style={{ gap: 10 }}>
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
      </div>
    </main>
  );
}
