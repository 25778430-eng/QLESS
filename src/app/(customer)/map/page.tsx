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
      {!query.here && <LocateMe />}
      {lowData ? (
        <p className="muted">The map is off because low-data mode is on. Switch it off in Account to see the map.</p>
      ) : (
        <VendorMap here={query.here} pins={mapPins(rows)} height={420} />
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
