import { requireStaff } from "@/lib/auth";
import { depositLine, loadQueue, todayQueue } from "@/lib/bookings";
import { rand, time } from "@/lib/format";
import { BREAK_MINUTES } from "@/lib/queue";
import { firstName } from "@/lib/verification";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { AutoRefresh } from "@/components/AutoRefresh";
import { staffBack, staffBreak, staffCallNext, staffDone, staffNoShow, staffReady, staffStart } from "./actions";
import { typeInfo } from "@/lib/business-types";

export const dynamic = "force-dynamic";

/** A staff member's own chair: who's in it, who's waiting for them, and their own Call next button. */
export default async function MyChair({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { user, staff, vendor } = await requireStaff();
  const day = await todayQueue(vendor.id);
  const onShift = !!day && day.status !== "CLOSED" && day.staffIds.includes(staff.id);
  const view = day ? await loadQueue(day) : null;
  const bookings = view?.bookings ?? [];
  const inChair = bookings.filter((b) => b.staffId === staff.id && (b.status === "CALLED" || b.status === "IN_SERVICE"));
  // Clients who picked me, plus "anyone" clients, in queue order.
  const next = bookings.filter((b) => b.status === "WAITING" && (b.staffId === staff.id || b.staffId === null));
  const name = (b: (typeof bookings)[number]) => b.customer?.name ?? b.walkInName ?? "Walk-in";
  const onBreak = staff.breakUntil && staff.breakUntil > new Date() ? staff.breakUntil : null;
  const info = typeInfo(vendor.businessType);
  const toCollect = (b: (typeof bookings)[number]) => b.priceCents - (b.depositStatus === "PAID" ? b.depositCents : 0);

  return (
    <main className="main">
      <AutoRefresh seconds={20} />
      <div className="row between" style={{ alignItems: "flex-end" }}>
        <div className="hello"><small>{firstName(user.name)} · {vendor.name}</small>My {info.station}</div>
        <span className={`pill ${onShift ? (day!.status === "PAUSED" ? "sig" : "ok") : ""}`}><span className="dot" />{!onShift ? "Not on today" : day!.status === "PAUSED" ? "Paused" : "On shift"}</span>
      </div>
      <Messages searchParams={searchParams} />
      {onBreak && (
        <div className="banner row between">
          <span>On a break until {time(onBreak)}. Your clients have their new times.</span>
          <form action={staffBack}><Submit className="btn sm">I&apos;m back</Submit></form>
        </div>
      )}
      {!onShift && <div className="fill small">You&apos;re not on today&apos;s queue. The owner picks who&apos;s working when they open the queue.</div>}

      {inChair.map((b) => (
        <div key={b.id} className={b.status === "IN_SERVICE" ? "live" : "now"}>
          <span className="small" style={{ fontWeight: 700, opacity: 0.8 }}>
            {b.status === "IN_SERVICE" ? `In my chair since ${time(b.startedAt)}` : b.arrived ? "Called · here" : `Called at ${time(b.calledAt)} · on the way`}
          </span>
          <span className="big" style={{ fontFamily: "var(--f-display)", fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{name(b)}</span>
          <span className="small">{b.ticketNo ? `Ticket ${b.ticketNo} · ` : ""}{b.service.name}{b.optionLabel ? ` (${b.optionLabel})` : ""}{b.plate ? ` · ${b.plate}` : ""} · {rand(b.priceCents)} · {depositLine(b)} · code {b.checkInCode}</span>
          <div className="row">
            {info.plates && b.status === "IN_SERVICE" && !b.readyAt && <form action={staffReady} className="grow"><input type="hidden" name="id" value={b.id} /><Submit className="btn">Car ready</Submit></form>}
            {b.status === "CALLED" && <form action={staffStart} className="grow"><input type="hidden" name="id" value={b.id} /><Submit className="btn">Start</Submit></form>}
            <form action={staffDone} className="grow"><input type="hidden" name="id" value={b.id} /><Submit className={b.status === "IN_SERVICE" ? "btn sig" : "btn alt"}>Done · {rand(toCollect(b))} to collect</Submit></form>
            {b.status === "CALLED" && !b.arrived && <form action={staffNoShow}><input type="hidden" name="id" value={b.id} /><Submit className="btn sm warn">No-show</Submit></form>}
          </div>
        </div>
      ))}

      <div className="row between"><h3>My next</h3><span className="small muted">{next.length} waiting</span></div>
      <div>
        {next.length === 0 && <p className="muted">Nobody is waiting for you.</p>}
        {next.slice(0, 8).map((b, i) => (
          <div key={b.id} className="q">
            <span className="no">{b.ticketNo ?? i + 1}</span>
            <span className="grow">
              <b>{name(b)}</b><br />
              <span className="small muted">{b.service.name} · {b.staffId ? `asked for ${staff.name}` : "anyone"} · ~{time(view?.etas.get(b.id))}</span>
            </span>
            {b.isWalkIn ? <span className="pill">Walk-in</span> : b.arrived ? <span className="pill ok">Here</span> : <span className="pill">Booked</span>}
            {onShift && (
              <form action={staffCallNext}>
                <input type="hidden" name="id" value={b.id} />
                <Submit className={i === 0 ? "btn sm sig" : "btn sm alt"}>Call</Submit>
              </form>
            )}
          </div>
        ))}
      </div>
      {onShift && (
        <form action={staffCallNext}>
          <Submit>{next[0] ? `Call next · ${name(next[0])}` : "Call next"}</Submit>
        </form>
      )}
      {next.length > 1 && onShift && <p className="small muted">Tap Call next to someone to take them out of order, for example a walk-in who is already here.</p>}
      {onShift && !onBreak && (
        <div className="card stack">
          <b>Take a break</b>
          <span className="small muted">Your waiting clients get a new time and keep their spot and deposit. &quot;Anyone&quot; clients go to other chairs.</span>
          <div className="row">
            {BREAK_MINUTES.map((m) => (
              <form key={m} action={staffBreak} className="grow">
                <input type="hidden" name="minutes" value={m} />
                <Submit className="btn alt">{m} min</Submit>
              </form>
            ))}
          </div>
        </div>
      )}
      <p className="small muted">You only see your own clients. The owner sees the whole shop.</p>
    </main>
  );
}
