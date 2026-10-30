import Link from "next/link";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth";
import { distance } from "@/lib/format";
import { findShops, mapPins, parseShopQuery } from "@/lib/discover";
import { VendorMap } from "@/components/VendorMap";
import { LocateMe } from "@/components/LocateMe";

export const dynamic = "force-dynamic";

export default async function MapPage({ searchParams }: { searchParams: { q?: string; cat?: string; lat?: string; lng?: string } }) {
  const user = await currentUser();
  const lowData = user ? user.lowData : cookies().get("lowData")?.value === "1";
  const query = parseShopQuery(searchParams);
  const rows = await findShops(query);
  const nearest = rows.find((r) => r.state.kind === "");
  return (
    <main className="main">
      <h1>Map</h1>
      <form className="row" action="/map">
        {query.here && <><input type="hidden" name="lat" value={query.here.lat} /><input type="hidden" name="lng" value={query.here.lng} /></>}
        {query.cat !== "All" && <input type="hidden" name="cat" value={query.cat} />}
        <input className="i grow" name="q" defaultValue={query.q} placeholder="Search a shop, area or service" aria-label="Search shops on the map" />
        <button className="btn sm">Search</button>
      </form>
      {query.q && (
        <p className="small muted">
          {rows.length ? `${rows.length} shop${rows.length === 1 ? "" : "s"} for "${query.q}"` : `No shops found for "${query.q}"`} ·{" "}
          <Link href="/map">Clear</Link>
        </p>
      )}
      {!query.here && <LocateMe />}
      {lowData ? (
        <p className="muted">The map is off because low-data mode is on. Switch it off in Account to see the map.</p>
      ) : (
        <VendorMap here={query.here} pins={mapPins(rows)} height={420} />
      )}
      {query.q && rows.length > 1 && (
        <div className="stack" style={{ gap: 0 }}>
          {rows.slice(0, 6).map(({ v, km, state }) => (
            <Link key={v.id} className="listrow" href={`/v/${v.slug}`}>
              <span className="grow"><b>{v.name}</b><br /><span className="small muted">{v.category}{km != null ? ` · ${distance(km)}` : ""} · {state.label}</span></span>
              <span className="chev">›</span>
            </Link>
          ))}
        </div>
      )}
      {nearest && (
        <div className="card stack">
          <b>{nearest.v.name}</b>
          <span className="small muted">{nearest.v.category}{nearest.km != null ? ` · ${distance(nearest.km)}` : ""} · {nearest.state.label}</span>
          <div className="two">
            {nearest.v.lat != null && (
              <a className="btn alt" href={`https://www.google.com/maps/dir/?api=1&destination=${nearest.v.lat},${nearest.v.lng}`} target="_blank" rel="noopener">Directions</a>
            )}
            <Link className="btn" href={`/v/${nearest.v.slug}`}>Join queue</Link>
          </div>
        </div>
      )}
    </main>
  );
}
