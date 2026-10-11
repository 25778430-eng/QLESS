import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { distance, haversineKm, initials, sastDate } from "@/lib/format";
import { VendorMap } from "@/components/VendorMap";
import { LocateMe } from "@/components/LocateMe";
import { LowDataToggle } from "@/components/LowDataToggle";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const CATEGORIES = ["All", "Barber", "Nail technician", "Hair salon", "Other"];
const LABEL: Record<string, string> = { All: "All", Barber: "Barbers", "Nail technician": "Nails", "Hair salon": "Hair", Other: "Other" };

type SP = { q?: string; cat?: string; lat?: string; lng?: string };

export default async function Discover({ searchParams }: { searchParams: SP }) {
  const user = await currentUser();
  const lowData = user ? user.lowData : cookies().get("lowData")?.value === "1";
  const q = (searchParams.q ?? "").trim();
  const cat = CATEGORIES.includes(searchParams.cat ?? "") ? searchParams.cat! : "All";
  const here = searchParams.lat && searchParams.lng ? { lat: Number(searchParams.lat), lng: Number(searchParams.lng) } : null;

  const vendors = await db.vendor.findMany({
    where: {
      status: "APPROVED",
      ...(cat !== "All" ? { category: cat } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { address: { contains: q, mode: "insensitive" } }, { services: { some: { name: { contains: q, mode: "insensitive" } } } }] } : {}),
    },
    include: {
      queueDays: { where: { date: sastDate() } },
      reviews: { select: { rating: true } },
    },
    take: 100,
  });

  const counts = await db.booking.groupBy({
    by: ["queueDayId"],
    where: { queueDayId: { in: vendors.flatMap((v) => v.queueDays.map((d) => d.id)) }, status: { in: ["WAITING", "CALLED"] } },
    _count: true,
  });
  const used = await db.booking.groupBy({
    by: ["queueDayId"],
    where: { queueDayId: { in: vendors.flatMap((v) => v.queueDays.map((d) => d.id)) }, status: { not: "CANCELLED" } },
    _count: true,
  });
  const waitingBy = new Map(counts.map((c) => [c.queueDayId, c._count]));
  const usedBy = new Map(used.map((c) => [c.queueDayId, c._count]));

  const rows = vendors
    .map((v) => {
      const day = v.queueDays[0];
      const km = here && v.lat != null && v.lng != null ? haversineKm(here, { lat: v.lat, lng: v.lng }) : null;
      const rating = v.reviews.length ? v.reviews.reduce((s, r) => s + r.rating, 0) / v.reviews.length : 0;
      let state: { label: string; kind: "" | "bad" } = { label: "Closed now", kind: "bad" };
      if (day && day.status !== "CLOSED") {
        state = (usedBy.get(day.id) ?? 0) >= day.capacity ? { label: "Full today", kind: "bad" } : { label: `${waitingBy.get(day.id) ?? 0} waiting`, kind: "" };
      }
      return { v, km, rating, count: v.reviews.length, state };
    })
    .sort((a, b) => (a.km ?? 1e9) - (b.km ?? 1e9) || b.rating - a.rating);

  const qs = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...searchParams, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/discover?${p}`;
  };

  return (
    <main className="main">
      <div className="row between">
        <div>
          <div className="small muted">{here ? "Near you" : "All shops"}</div>
          <h1 style={{ fontSize: 22 }}>Find a shop</h1>
        </div>
        <Link className="btn sm sig" href="/scan">Scan QR</Link>
      </div>
      <LowDataToggle on={lowData} signedIn={!!user} />
      <form className="row" action="/discover">
        {here && <><input type="hidden" name="lat" value={here.lat} /><input type="hidden" name="lng" value={here.lng} /></>}
        {cat !== "All" && <input type="hidden" name="cat" value={cat} />}
        <input className="i grow" name="q" defaultValue={q} placeholder="Search barbers, nails, braids…" />
        <button className="btn sm">Search</button>
      </form>
      <div className="chips" role="group" aria-label="Category">
        {CATEGORIES.map((c) => (
          <Link key={c} className="chip" aria-pressed={c === cat} href={qs({ cat: c === "All" ? undefined : c })}>{LABEL[c]}</Link>
        ))}
      </div>
      {!here && <LocateMe />}
      {lowData ? (
        <p className="small muted">Map is off to save data. Shops are listed by distance.</p>
      ) : (
        <VendorMap
          here={here}
          pins={rows.filter((r) => r.v.lat != null).map((r) => ({ lat: r.v.lat!, lng: r.v.lng!, label: `${r.v.name} · ${r.state.label}`, href: `/v/${r.v.slug}`, busy: r.state.kind === "bad" }))}
        />
      )}
      <div className="stack" style={{ gap: 0 }}>
        {rows.length === 0 && <p className="muted">No shops found{q ? ` for "${q}"` : ""}.</p>}
        {rows.map(({ v, km, rating, count, state }) => (
          <Link key={v.id} className="listrow" href={`/v/${v.slug}`}>
            <span className="avatar">{initials(v.name)}</span>
            <span className="grow">
              <b>{v.name}</b>
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
