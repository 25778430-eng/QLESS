import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { isOpenToday, loadQueue, todayQueue } from "@/lib/bookings";
import { initials, rand, shortDate } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { AutoRefresh } from "@/components/AutoRefresh";
import { joinQueue } from "./actions";

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
  const user = await currentUser();
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
            Verified business
          </div>
          <div className="small muted">{vendor.address}</div>
        </div>
      </div>
      <Messages searchParams={searchParams} />
      {day?.status === "PAUSED" && <div className="banner">Paused {day.pauseReason ? `(${day.pauseReason.toLowerCase()})` : ""}. Times shown include the pause.</div>}
      <div className="stat">
        <div><b>{waiting.length}</b><span>in queue</span></div>
        <div><b>{open ? `~${waitMins}` : "–"}</b><span>min wait</span></div>
        <div><b>{working.length}</b><span>staff on</span></div>
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
          <ServiceList services={vendor.services} />
          <Link className="btn" href={`/signin?next=/v/${vendor.slug}`}>Sign in to join the queue</Link>
        </>
      ) : !open ? (
        <>
          <ServiceList services={vendor.services} />
          <div className="fill">The queue isn&apos;t open right now. Check back when the shop opens.</div>
        </>
      ) : full ? (
        <>
          <ServiceList services={vendor.services} />
          <div className="fill">The queue is full for today.</div>
        </>
      ) : (
        <form action={joinQueue} className="stack" style={{ gap: 12 }}>
          <input type="hidden" name="vendorId" value={vendor.id} />
          <h3>Choose who serves you</h3>
          <label className="opt">
            <input type="radio" name="staffId" value="any" defaultChecked />
            <span className="grow"><b>Anyone available</b><br /><span className="small muted">Fastest · {waitingFor(null)} waiting</span></span>
          </label>
          {working.map((s) => (
            <label className="opt" key={s.id}>
              <input type="radio" name="staffId" value={s.id} />
              <span className="avatar sm">{initials(s.name)}</span>
              <span className="grow"><b>{s.name}</b><br /><span className="small muted">{waitingFor(s.id)} waiting for {s.name}</span></span>
            </label>
          ))}
          <h3>Choose a service</h3>
          <div className="card" style={{ padding: "4px 14px" }}>
            {vendor.services.map((s, i) => (
              <label className="svc" key={s.id}>
                <span><input type="radio" name="serviceId" value={s.id} defaultChecked={i === 0} /> <b>{s.name}</b><br /><span className="small muted">{s.durationMins} min</span></span>
                <span className="p">{rand(s.priceCents)}</span>
              </label>
            ))}
          </div>
          {vendor.depositCents > 0 && (
            <p className="small muted">A {rand(vendor.depositCents)} deposit holds your spot and comes off the final price.</p>
          )}
          <Submit>Join the queue</Submit>
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

function ServiceList({ services }: { services: { id: string; name: string; durationMins: number; priceCents: number }[] }) {
  return (
    <div className="card" style={{ padding: "4px 14px" }}>
      {services.map((s) => (
        <div className="svc" key={s.id}><span><b>{s.name}</b><br /><span className="small muted">{s.durationMins} min</span></span><span className="p">{rand(s.priceCents)}</span></div>
      ))}
    </div>
  );
}
