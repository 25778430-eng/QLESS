import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOpenToday, loadQueue, todayQueue } from "@/lib/bookings";
import { longDate, rand, time } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { AutoRefresh } from "@/components/AutoRefresh";
import { getSettings } from "@/lib/settings";
import { firstName, greeting, requiredDocs } from "@/lib/verification";
import { callNextAction, checkInAction, closeToday, doneAction, noShowAction, readyAction, resumeAction, startAction, walkInAction } from "./actions";
import { WalkInFields } from "@/components/WalkInFields";
import { typeInfo } from "@/lib/business-types";

export const dynamic = "force-dynamic";

type SP = { error?: string; notice?: string };

export default async function VendorHome({ searchParams }: { searchParams: SP }) {
  const { user, vendor } = await requireVendor();

  if (vendor.status !== "APPROVED") {
    const rules = await getSettings();
    const have = await db.document.findMany({ where: { vendorId: vendor.id }, select: { kind: true } });
    const missing = requiredDocs(vendor.level, rules).filter((k) => !have.some((d) => d.kind === k));
    return (
      <main className="main">
        <h2>{vendor.status === "PENDING" ? "Application sent" : "Application not approved"}</h2>
        <Messages searchParams={searchParams} />
        <div className="card stack">
          <span className={`pill ${vendor.status === "PENDING" ? "sig" : "bad"}`} style={{ alignSelf: "flex-start" }}>
            {vendor.status === "PENDING" ? "Waiting for approval" : "Rejected"}
          </span>
          <b>{vendor.name}</b>
          <span className="small muted">{vendor.level === "BASIC" ? "Basic listing" : "Verified listing"}{vendor.cipc ? <> · <span className="mono">CIPC {vendor.cipc}</span></> : null}</span>
          {vendor.rejectReason && <span className="small">Reason: {vendor.rejectReason}</span>}
        </div>
        <ul className="stack small" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          <li>✓ Phone verified</li>
          <li>✓ Business details submitted</li>
          <li>{missing.length ? "○ Upload your documents" : "✓ Documents uploaded"}</li>
          <li>{vendor.status === "PENDING" ? "…" : "✗"} Qless checks your documents</li>
          <li>○ Go live and print your QR code</li>
        </ul>
        <p className="small muted">You can set up your hours, services and staff while you wait.</p>
        {missing.length > 0 && <Link className="btn" href="/vendor/documents">Upload documents ({missing.length} to go)</Link>}
        <Link className={missing.length ? "btn alt" : "btn"} href="/vendor/setup">Set up my shop</Link>
      </main>
    );
  }

  const day = await todayQueue(vendor.id);
  if (!day || day.status === "CLOSED") {
    return (
      <main className="main">
        <h2>Today&apos;s queue</h2>
        <p className="muted">{longDate()} · {vendor.openTime}–{vendor.closeTime}</p>
        <Messages searchParams={searchParams} />
        {!isOpenToday(vendor) && <div className="fill small">Your shop is set as closed today. You can still open a queue.</div>}
        <Link className="btn" href="/vendor/start">{day ? "Reopen the queue" : "Start today's queue"}</Link>
        <Link className="btn alt" href="/vendor/qr">Show my QR poster</Link>
      </main>
    );
  }

  const view = await loadQueue(day);
  const staff = await db.staff.findMany({ where: { id: { in: day.staffIds } } });
  const services = await db.service.findMany({ where: { vendorId: vendor.id, active: true }, orderBy: { name: "asc" } });
  const waiting = view.bookings.filter((b) => b.status === "WAITING");
  const active = view.bookings.filter((b) => b.status === "CALLED" || b.status === "IN_SERVICE");
  const done = view.bookings.filter((b) => b.status === "DONE");
  const takings = done.reduce((s, b) => s + b.priceCents, 0);
  const name = (b: (typeof view.bookings)[number]) => b.customer?.name ?? b.walkInName ?? "Walk-in";
  const info = typeInfo(vendor.businessType);
  const what = (b: (typeof view.bookings)[number]) => [b.service.name + (b.optionLabel ? ` (${b.optionLabel})` : ""), b.plate, b.item, b.extras && `+ ${b.extras}`].filter(Boolean).join(" · ");

  return (
    <main className="main">
      <AutoRefresh seconds={20} />
      <div className="row between" style={{ alignItems: "flex-end" }}>
        <div className="hello"><small>{greeting()}, {firstName(user.name)} · {vendor.name}</small>{waiting.length} waiting</div>
        <span className={`pill ${day.status === "PAUSED" ? "sig" : "ok"}`}><span className="dot" />{day.status === "PAUSED" ? "Paused" : `Open · ${staff.length} ${info.station}${staff.length === 1 ? "" : "s"}`}</span>
      </div>
      <Messages searchParams={searchParams} />
      {day.status === "PAUSED" && (
        <form action={resumeAction} className="banner row between">
          <span>Paused{day.pauseReason ? ` (${day.pauseReason.toLowerCase()})` : ""} until {time(day.pausedUntil)}</span>
          <Submit className="btn sm">Resume</Submit>
        </form>
      )}
      <div className="stat">
        <div><b>{waiting.length}</b><span>waiting</span></div>
        <div><b>{done.length}</b><span>done today</span></div>
        <div><b className="mono" style={{ fontSize: 20 }}>{rand(takings)}</b><span>takings</span></div>
      </div>

      {active.map((b) => (
        <div key={b.id} className="card stack">
          <div className="row between">
            <span className="small muted">{b.readyAt ? `Ready since ${time(b.readyAt)} · waiting to collect` : b.status === "IN_SERVICE" ? (b.jobStage ? `Job · ${b.jobStage.toLowerCase()}` : "Now serving") : b.arrived ? "Called · here" : `Called at ${time(b.calledAt)} · on the way`}</span>
            {b.staff && <span className="pill">{b.staff.name}</span>}
          </div>
          <b><span className="mono">{b.ticketNo}</span> {name(b)} · {what(b)}</b>
          <div className="row wrap">
            {b.status === "CALLED" && <form action={startAction}><input type="hidden" name="id" value={b.id} /><Submit className="btn sm">Start</Submit></form>}
            {info.plates && b.status === "IN_SERVICE" && !b.readyAt && <form action={readyAction}><input type="hidden" name="id" value={b.id} /><Submit className="btn sm sig">Car ready</Submit></form>}
            {b.jobStage && <Link className="btn sm alt" href={`/vendor/jobs#${b.id}`}>Job card</Link>}
            <form action={doneAction}><input type="hidden" name="id" value={b.id} /><Submit className="btn sm alt">{b.readyAt || b.jobStage ? "Collected" : "Done"}</Submit></form>
            {b.status === "CALLED" && !b.arrived && <form action={noShowAction}><input type="hidden" name="id" value={b.id} /><Submit className="btn sm warn">No-show</Submit></form>}
          </div>
        </div>
      ))}

      <div>
        {waiting.length === 0 && <p className="muted">Nobody waiting.</p>}
        {waiting.map((b, i) => (
          <div key={b.id} className="q">
            <span className="no">{b.ticketNo ?? String(i + 1).padStart(2, "0")}</span>
            <span className="grow">
              <b>{name(b)}</b><br />
              <span className="small muted">{what(b)}{b.staff ? ` · ${b.staff.name}` : ""} · {b.scheduledAt ? `booked ${time(b.scheduledAt)}` : `~${time(view.etas.get(b.id))}`}</span>
            </span>
            {b.isWalkIn && <span className="pill">Walk-in</span>}
            {b.arrived ? <span className="pill ok">Here</span> : <span className="pill sig">On way</span>}
          </div>
        ))}
      </div>

      <div className="row wrap" style={{ gap: 8 }}>
        {staff.length > 1 ? (
          staff.map((s) => (
            <form key={s.id} action={callNextAction} className="grow">
              <input type="hidden" name="staffId" value={s.id} />
              <Submit>Call next for {s.name}</Submit>
            </form>
          ))
        ) : (
          <form action={callNextAction} className="grow">
            <input type="hidden" name="staffId" value={staff[0]?.id ?? ""} />
            <Submit>Call next</Submit>
          </form>
        )}
      </div>

      <details className="card">
        <summary>+ Add a walk-in</summary>
        <form action={walkInAction} className="stack" style={{ marginTop: 10 }}>
          <WalkInFields services={services} businessType={vendor.businessType} />
          <select className="i" name="staffId"><option value="any">Anyone available</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <Submit>Add walk-in</Submit>
        </form>
      </details>

      <form action={checkInAction} className="card stack">
        <b>Check in an arrival</b>
        <div className="row">
          <input className="i mono" name="code" placeholder="7K4P" maxLength={4} style={{ letterSpacing: ".15em", textTransform: "uppercase" }} required />
          <Submit className="btn sm">Check in</Submit>
        </div>
      </form>

      <div className="row" style={{ gap: 8 }}>
        {day.status === "PAUSED" ? null : <Link className="btn warn" href="/vendor/pause">Pause queue</Link>}
        <Link className="btn alt" href="/vendor/summary">Today&apos;s summary</Link>
      </div>
      <div className="two">
        <Link className="btn alt" href="/vendor/qr">QR poster</Link>
        <Link className="btn alt" href="/vendor/tv">TV screen</Link>
      </div>
      {info.jobs && <Link className="btn alt" href="/vendor/jobs">Open job cards</Link>}
      <form action={closeToday}><Submit className="btn alt">Close the queue for today</Submit></form>
    </main>
  );
}
