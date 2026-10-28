import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { aheadOf, loadQueue } from "@/lib/bookings";
import { distance, initials, time } from "@/lib/format";
import { CATEGORIES, CATEGORY_LABEL, findShops, mapPins, parseShopQuery } from "@/lib/discover";
import { firstName, greeting } from "@/lib/verification";
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

export default async function Home(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  const user = await currentUser();
  const lowData = user ? user.lowData : (await cookies()).get("lowData")?.value === "1";
  const query = parseShopQuery(searchParams);
  const { q, cat, here } = query;
  const rows = await findShops(query);
  const ticket = user ? await liveTicket(user.id) : null;

  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...searchParams, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/discover?${p}`;
  };

  return (
    <main className="main">
      <div className="hello">
        <small>{user ? `${greeting()},` : "Book your spot. Arrive when it's your turn."}</small>
        {user ? firstName(user.name) : "Find a shop"}
      </div>

      {ticket && (
        <Link className="live" href={`/bookings/${ticket.b.id}`}>
          <div className="row between" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="k">Your ticket · {ticket.b.vendor.name}</div>
              <div className="big">
                {ticket.b.status === "PENDING_PAYMENT" ? "Pay" : ticket.b.status === "CALLED" ? "Go!" : ticket.b.status === "IN_SERVICE" ? "Now" : ordinal(ticket.ahead + 1)}
              </div>
            </div>
            {ticket.b.status === "WAITING" && ticket.eta && (
              <div style={{ textAlign: "right" }}><div className="k">Your turn about</div><div className="big" style={{ fontSize: 28 }}>{time(ticket.eta)}</div></div>
            )}
          </div>
          <span className="strip">
            <span>
              {ticket.b.status === "PENDING_PAYMENT" ? "Pay to hold your spot" : ticket.b.status === "CALLED" ? "It's your turn. Head over now" : ticket.b.status === "IN_SERVICE" ? "Enjoy your visit" : `${ticket.ahead} ahead of you`}
            </span>
            <span>View ›</span>
          </span>
        </Link>
      )}

      <LowDataToggle on={lowData} signedIn={!!user} />
      <form className="row" action="/discover">
        {here && <><input type="hidden" name="lat" value={here.lat} /><input type="hidden" name="lng" value={here.lng} /></>}
        {cat !== "All" && <input type="hidden" name="cat" value={cat} />}
        <input className="i grow" name="q" defaultValue={q} placeholder="Barbers, nails, braids…" aria-label="Search shops" />
        <button className="btn sm">Search</button>
      </form>
      <div className="chips" role="group" aria-label="Category">
        {CATEGORIES.map((c) => (
          <Link key={c} className="chip" aria-pressed={c === cat} href={qs({ cat: c === "All" ? undefined : c })}>{CATEGORY_LABEL[c]}</Link>
        ))}
      </div>
      {!here && <LocateMe />}

      <div className="row between"><h3>{here ? "Near you" : "Shops"}</h3>{!lowData && <Link className="small" href={`/map?${new URLSearchParams(Object.entries(searchParams).filter(([, v]) => v) as [string, string][])}`}><b>See map</b></Link>}</div>
      {!lowData && rows.length > 0 && <VendorMap here={here} pins={mapPins(rows)} height={170} />}
      <div className="stack" style={{ gap: 0 }}>
        {rows.length === 0 && <p className="muted">No shops found{q ? ` for "${q}"` : ""}.</p>}
        {rows.map(({ v, km, rating, count, state, featured }) => (
          <Link key={v.id} className="listrow" href={`/v/${v.slug}`}>
            <span className="avatar">{initials(v.name)}</span>
            <span className="grow">
              <b>{v.name}</b>{featured && <> <span className="pill sig">Featured</span></>}{v.level === "BASIC" && <> <span className="pill">Not verified</span></>}
              <br />
              <span className="small muted">
                {v.category}{km != null ? ` · ${distance(km)}` : ""}{count ? ` · ★ ${rating.toFixed(1)} (${count})` : " · New"}
              </span>
            </span>
            <span className={`pill ${state.kind}`}>{state.kind === "" && <span className="dot" />}{state.label}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
