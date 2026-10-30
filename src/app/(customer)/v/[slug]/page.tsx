import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { isOpenToday, loadQueue, todayQueue, typeSwitchedOn } from "@/lib/bookings";
import { initials, rand, shortDate, time } from "@/lib/format";
import { bookingFee } from "@/lib/fees";
import { getSettings } from "@/lib/settings";
import { vendorListed } from "@/lib/plan-billing";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { AutoRefresh } from "@/components/AutoRefresh";
import { joinQueue } from "./actions";
import { ServicePicker } from "@/components/ServicePicker";
import { priceFrom } from "@/lib/pricing";
import { typeInfo } from "@/lib/business-types";
import type { Service } from "@prisma/client";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function openDaysText(openDays: string): string {
  const on = DAY_NAMES.filter((_, i) => openDays[i] === "1");
  return on.length === 7 ? "Every day" : on.join(", ");
}

export default async function VendorPage({ params, searchParams }: { params: { slug: string }; searchParams: { error?: string } }) {
  const vendor = await db.vendor.findUnique({
    where: { slug: params.slug },
    include: {
      services: { where: { active: true }, orderBy: { priceCents: "asc" } },
      staff: { where: { active: true } },
      photos: { select: { id: true, caption: true }, orderBy: { createdAt: "desc" }, take: 12 },
      reviews: { orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true } } } },
    },
  });
  if (!vendor || vendor.status !== "APPROVED") notFound();
  if (!(await vendorListed(vendor)) || !(await typeSwitchedOn(vendor.businessType))) {
    return (
      <main className="main">
        <h2>{vendor.name}</h2>
        <p className="muted">This shop isn&apos;t taking bookings on Qless right now.</p>
        <Link className="btn alt" href="/discover">Find another shop</Link>
      </main>
    );
  }
  const info = typeInfo(vendor.businessType);
  const user = await currentUser();
  const feeCents = bookingFee(await getSettings());
  const lowData = user ? user.lowData : cookies().get("lowData")?.value === "1";

  const day = await todayQueue(vendor.id);
  const view = day ? await loadQueue(day) : null;
  const waiting = view ? view.bookings.filter((b) => b.status === "WAITING" || b.status === "CALLED") : [];
  const lastEta = view ? Math.max(Date.now(), ...[...view.etas.values()].map((d) => d.getTime())) : Date.now();
  const waitMins = Math.round((lastEta - Date.now()) / 60000);
  const used = view ? view.bookings.filter((b) => b.status !== "CANCELLED").length : 0;
  const full = !!day && used >= day.capacity;
  const open = !!day && day.status !== "CLOSED";
  const working = vendor.staff.filter((s) => day?.staffIds.includes(s.id));
  const rating = vendor.reviews.length ? vendor.reviews.reduce((s, r) => s + r.rating, 0) / vendor.reviews.length : 0;
  const waitingFor = (staffId: string | null) => waiting.filter((b) => (staffId ? b.staffId === staffId : true)).length;

  return (
    <main className="main">
      {open && <AutoRefresh seconds={30} />}
      <div className="row">
        <span className="avatar" style={{ width: 58, height: 58, fontSize: 22 }}>{initials(vendor.name)}</span>
        <div className="grow">
          <h2>{vendor.name}</h2>
          <div className="small muted">
            {vendor.reviews.length ? <><b>★ {rating.toFixed(1)}</b> · {vendor.reviews.length} reviews · </> : "New · "}
            {info.free ? "Free queue" : vendor.level === "VERIFIED" ? "Verified business" : <span className="pill">Not verified</span>}
          </div>
          <div className="small muted">
            {vendor.address}
            {vendor.lat != null && <> · <a href={`https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}`} target="_blank" rel="noopener"><b>Directions</b></a></>}
          </div>
        </div>
      </div>
      <Messages searchParams={searchParams} />
      {day?.status === "PAUSED" && <div className="banner">Paused {day.pauseReason ? `(${day.pauseReason.toLowerCase()})` : ""}. Times shown include the pause.</div>}
      <div className="stat">
        <div><b>{waiting.length}</b><span>in queue</span></div>
        <div><b>{open ? `~${waitMins}` : "–"}</b><span>min wait</span></div>
        <div><b>{working.length}</b><span>{info.station}s open</span></div>
      </div>
      <div className="small muted">
        Open {vendor.openTime}–{vendor.closeTime} · {openDaysText(vendor.openDays)}
        {!isOpenToday(vendor) && " · Closed today"}
      </div>

      {!lowData && vendor.photos.length > 0 && (
        <div className="gallery" aria-label="Photos of recent work">
          {vendor.photos.map((p) => (
            <figure key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.id}`} alt={p.caption || "Recent work"} loading="lazy" />
              {p.caption && <figcaption>{p.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      {!user ? (
        <>
          <ServiceList services={vendor.services} free={info.free} />
          <Link className="btn" href={`/signin?next=/v/${vendor.slug}`}>Sign in to join the queue</Link>
        </>
      ) : !open ? (
        <>
          <ServiceList services={vendor.services} free={info.free} />
          <div className="fill">The queue isn&apos;t open right now. Check back when the shop opens, or book a time on another day.</div>
          <Link className="btn" href={`/v/${vendor.slug}/book`}>Book a later day</Link>
        </>
      ) : full ? (
        <>
          <ServiceList services={vendor.services} free={info.free} />
          <div className="fill">The queue is full for today.</div>
          <Link className="btn" href={`/v/${vendor.slug}/book`}>Book a later day</Link>
        </>
      ) : (
        <form action={joinQueue} className="stack" style={{ gap: 12 }}>
          <input type="hidden" name="vendorId" value={vendor.id} />
          <h3>{info.free ? "Which counter" : "Choose who serves you"}</h3>
          <label className="opt">
            <input type="radio" name="staffId" value="any" defaultChecked />
            <span className="grow"><b>Anyone available</b><br /><span className="small muted">Fastest · {waitingFor(null)} waiting</span></span>
          </label>
          {working.map((s) => (
            <label className="opt" key={s.id}>
              <input type="radio" name="staffId" value={s.id} />
              <span className="avatar sm">{initials(s.name)}</span>
              <span className="grow"><b>{s.name}</b><br /><span className="small muted">{s.breakUntil && s.breakUntil > new Date() ? `On a break until ${time(s.breakUntil)} · ` : ""}{waitingFor(s.id)} waiting for {s.name}{s.endTime ? ` · until ${s.endTime}` : ""}</span></span>
            </label>
          ))}
          <ServicePicker services={vendor.services} businessType={vendor.businessType} />
          {info.free && <p className="small muted">Free. No deposit and no booking fee. You get a ticket number like A027.</p>}
          {!info.free && vendor.level === "BASIC" && <p className="small muted">This shop isn&apos;t verified yet, so there&apos;s no deposit. Pay the shop directly.</p>}
          {!info.free && vendor.level === "VERIFIED" && vendor.depositCents > 0 && (
            <p className="small muted">A {rand(vendor.depositCents)} deposit holds your spot and comes off the final price.</p>
          )}
          {!info.free && vendor.level === "VERIFIED" && feeCents > 0 && (
            <p className="small muted">Qless adds a {rand(feeCents)} booking fee, paid with {vendor.depositCents > 0 ? "the deposit" : "your booking"}. It isn&apos;t refunded.</p>
          )}
          <Submit>{info.free ? "Get a ticket" : "Join the queue"}</Submit>
          <Link className="btn alt" href={`/v/${vendor.slug}/book`}>Book a later day instead</Link>
        </form>
      )}

      {vendor.reviews.length > 0 && (
        <>
          <h3>Reviews</h3>
          {vendor.reviews.slice(0, 10).map((r) => (
            <div key={r.id} className="card small">
              {r.text && <><b>&ldquo;{r.text}&rdquo;</b><br /></>}
              <span className="muted">{r.customer.name.split(" ")[0]} · {"★".repeat(r.rating)} · {shortDate(r.createdAt)}</span>
            </div>
          ))}
        </>
      )}
    </main>
  );
}

function ServiceList({ services, free }: { services: Service[]; free: boolean }) {
  return (
    <div className="card" style={{ padding: "4px 14px" }}>
      {services.map((s) => {
        const p = priceFrom(s);
        return (
          <div className="svc" key={s.id}>
            <span><b>{s.isExtra ? `+ ${s.name}` : s.name}</b><br /><span className="small muted">{s.isExtra ? "Extra" : `${s.durationMins} min`}{s.bring ? ` · Bring: ${s.bring}` : ""}</span></span>
            <span className="p">{free && p.cents === 0 ? "Free" : `${p.from ? "from " : ""}${rand(p.cents)}`}</span>
          </div>
        );
      })}
    </div>
  );
}
