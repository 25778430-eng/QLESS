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
import { callNextAction, checkInAction, closeToday, doneAction, noShowAction, readyAction, resumeAction, startAction } from "./actions";
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
        {missing.length > 0 && <Link className="btn" href="/vendor/documents">Upload documents ({missing.length} to go)</Link>}
        <Link className={missing.length ? "btn alt" : "btn"} href="/vendor/account">Set up my shop</Link>
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
  const waiting = view.bookings.filter((b) => b.status === "WAITING");
  const active = view.bookings.filter((b) => b.status === "CALLED" || b.status === "IN_SERVICE");
  const done = view.bookings.filter((b) => b.status === "DONE");
  const takings = done.reduce((s, b) => s + b.priceCents, 0);
  const name = (b: (typeof view.bookings)[number]) => b.customer?.name ?? b.walkInName ?? "Walk-in";
  const info = typeInfo(vendor.businessType);
  const what = (b: (typeof view.bookings)[number]) => [b.service.name + (b.optionLabel ? ` (${b.optionLabel})` : ""), b.plate, b.item, b.extras && `+ ${b.extras}`].filter(Boolean).join(" · ");

  const inBay = (staffId: string) => active.find((b) => b.staffId === staffId);
  const unassigned = active.filter((b) => !b.staffId || !staff.some((s) => s.id === b.staffId));
  const nextFor = (staffId: string) => waiting.find((b) => b.staffId === staffId || b.staffId === null);

  // More than 2 bays: small blocks in a grid so the waiting list stays on screen.
  const compact = staff.length > 2;

  // One black "now serving" card per bay. Free bays show a lighter card with their own Call next.
  const bayCard = (b: (typeof active)[number] | undefined, s: (typeof staff)[number] | null, key: string) => {
    const next = s ? nextFor(s.id) : undefined;
    const call = s && day.status !== "PAUSED" && (
      <form action={callNextAction} className="grow">
        <input type="hidden" name="staffId" value={s.id} />
        <Submit className="btn sig">{next ? `Call next · ${next.ticketNo ?? name(next)}` : "Call next"}</Submit>
      </form>
    );
    if (compact) {
      const callMini = s && day.status !== "PAUSED" && (!b || b.status === "IN_SERVICE") && (
        <form action={callNextAction}><input type="hidden" name="staffId" value={s.id} /><Submit className="btn sig sm">{next ? `Call ${next.ticketNo ?? "next"}` : "Call next"}</Submit></form>
      );
      return (
        <div key={key} className={`serve mini${b ? "" : " free"}`}>
          <span className="lab ell">{b?.staff?.name ?? s?.name ?? "Anyone"}</span>
          {b ? (
            <>
              <span className="nm ell">{b.ticketNo ? `${b.ticketNo} · ` : ""}{name(b)}</span>
              <span className="lab ell">{b.status === "IN_SERVICE" ? `since ${time(b.startedAt)}` : b.arrived ? "called · here" : `called ${time(b.calledAt)}`}</span>
              {b.status === "CALLED"
                ? <form action={startAction}><input type="hidden" name="id" value={b.id} /><Submit className="btn ghost sm">Start</Submit></form>
                : <form action={doneAction}><input type="hidden" name="id" value={b.id} /><Submit className="btn ghost sm">{b.readyAt || b.jobStage ? "Collected" : "Done"}</Submit></form>}
            </>
          ) : <span className="nm">Free</span>}
          {callMini}
        </div>
      );
    }
    if (!b) {
      return (
        <div key={key} className="serve free">
          <div className="row between"><span className="lab">Bay · {s?.name}</span><span className="lab">free</span></div>
          <div className="row"><span className="nm grow">Nobody in the bay</span></div>
          {call}
        </div>
      );
    }
    return (
      <div key={key} className="serve">
        <div className="row between">
          <span className="lab">Bay · {b.staff?.name ?? s?.name ?? "anyone"}</span>
          <span className="lab">{b.readyAt ? `ready ${time(b.readyAt)}` : b.status === "IN_SERVICE" ? `since ${time(b.startedAt)}` : b.arrived ? "called · here" : `called ${time(b.calledAt)}`}</span>
        </div>
        {b.ticketNo ? <><div className="tk">{b.ticketNo}</div><div className="nm">{name(b)} · {what(b)}</div></> : <><div className="nm big">{name(b)}</div><div className="lab">{what(b)}</div></>}
        {b.restPaidCents > 0 && <span className="pill ok" style={{ alignSelf: "flex-start" }}>Paid {rand(b.restPaidCents)} in the app</span>}
        <div className="row wrap">
          {b.status === "CALLED" && <form action={startAction} className="grow"><input type="hidden" name="id" value={b.id} /><Submit className="btn ghost">Start</Submit></form>}
          {info.plates && b.status === "IN_SERVICE" && !b.readyAt && <form action={readyAction} className="grow"><input type="hidden" name="id" value={b.id} /><Submit className="btn ghost">Car ready</Submit></form>}
          {b.jobStage && <Link className="btn ghost" href={`/vendor/jobs#${b.id}`}>Job card</Link>}
          <form action={doneAction} className="grow"><input type="hidden" name="id" value={b.id} /><Submit className="btn ghost">{b.readyAt || b.jobStage ? "Collected" : "Done"}</Submit></form>
          {b.status === "CALLED" && !b.arrived && <form action={noShowAction}><input type="hidden" name="id" value={b.id} /><Submit className="btn ghost">No-show</Submit></form>}
        </div>
        {b.status === "IN_SERVICE" && call}
      </div>
    );
  };

  return (
    <main className="main app">
      <AutoRefresh seconds={20} />
      <div className="row between" style={{ alignItems: "flex-end" }}>
        <div className="hello"><small>{greeting()}, {firstName(user.name)}</small>Queue</div>
        <span className={`pill ${day.status === "PAUSED" ? "sig" : "ok"}`}><span className="dot" />{day.status === "PAUSED" ? "Paused" : `Open · ${staff.length} bay${staff.length === 1 ? "" : "s"}`}</span>
      </div>
      <Messages searchParams={searchParams} />
      {day.status === "PAUSED" && (
        <form action={resumeAction} className="banner row between">
          <span>Paused{day.pauseReason ? ` (${day.pauseReason.toLowerCase()})` : ""} until {time(day.pausedUntil)}</span>
          <Submit className="btn sm">Resume</Submit>
        </form>
      )}

      <div className="qcols">
      <div className={compact ? "bays" : "stack"} style={compact ? undefined : { gap: 14 }}>
        {staff.map((s) => bayCard(inBay(s.id), s, s.id))}
        {unassigned.map((b) => bayCard(b, null, b.id))}
      </div>

      <div className="qwait stack" style={{ gap: 14 }}>
      <div className="row between"><b>Waiting</b><span className="small muted">{waiting.length} · {done.length} done · {rand(takings)} today</span></div>
      <div>
        {waiting.length === 0 && <p className="muted">Nobody waiting.</p>}
        {waiting.map((b, i) => (
          <div key={b.id} className="q">
            <span className="no">{b.ticketNo ?? String(i + 1).padStart(2, "0")}</span>
            <span className="grow">
              <b>{name(b)}</b><br />
              <span className="small muted">{what(b)}{b.staff ? ` · ${b.staff.name}` : ""} · {b.scheduledAt ? `booked ${time(b.scheduledAt)}` : `~${time(view.etas.get(b.id))}`}</span>
            </span>
            {b.isWalkIn ? <span className="pill">Walk-in</span> : b.arrived ? <span className="pill ok">Here</span> : <span className="pill sig">On way</span>}
          </div>
        ))}
      </div>

      <div className="row" style={{ gap: 8, alignItems: "stretch" }}>
        <form action={checkInAction} className="row grow" style={{ gap: 8 }}>
          <input className="i mono grow" name="code" placeholder="Check-in code" maxLength={4} style={{ letterSpacing: ".15em", textTransform: "uppercase" }} aria-label="Check-in code" required />
          <Submit className="btn sm">Check in</Submit>
        </form>
        <details className="more">
          <summary className="btn alt" aria-label="More">⋯</summary>
          <div className="moremenu">
            {day.status !== "PAUSED" && <Link href="/vendor/pause">Pause the queue</Link>}
            <Link href="/vendor/summary">Today&apos;s summary</Link>
            <Link href="/vendor/qr">QR poster</Link>
            <Link href="/vendor/tv">TV screen</Link>
            {info.jobs && <Link href="/vendor/jobs">Job cards</Link>}
            <form action={closeToday}><button>Close the queue for today</button></form>
          </div>
        </details>
      </div>
      </div>
      </div>
    </main>
  );
}
