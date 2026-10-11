import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aheadOf, depositLine, loadQueue } from "@/lib/bookings";
import { ARRIVAL_WINDOW_MINS, refundOnCancel } from "@/lib/queue";
import { rand, time } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Countdown } from "@/components/Countdown";
import { reviewAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; notice?: string; paid?: string } }) {
  const user = await requireUser();
  const b = await db.booking.findFirst({
    where: { id: params.id, customerId: user.id },
    include: { vendor: true, service: true, staff: true, queueDay: true, review: true },
  });
  if (!b) notFound();
  const view = await loadQueue(b.queueDay);
  const eta = view.etas.get(b.id);
  const ahead = aheadOf(view, b.id);
  const live = ["PENDING_PAYMENT", "WAITING", "CALLED", "IN_SERVICE"].includes(b.status);
  const title = `${b.service.name}${b.staff ? ` with ${b.staff.name}` : ""}`;

  return (
    <main className="main">
      {live && <AutoRefresh seconds={b.status === "PENDING_PAYMENT" ? 5 : 15} />}
      <Messages searchParams={searchParams} />
      {searchParams.paid && b.status === "PENDING_PAYMENT" && <div className="fill small">Waiting for PayFast to confirm your payment…</div>}

      {b.status === "PENDING_PAYMENT" && (
        <>
          <h2>Pay your deposit</h2>
          <p className="muted">Your spot at {b.vendor.name} is held for 15 minutes while you pay.</p>
          <Link className="btn" href={`/bookings/${b.id}/pay`}>Pay {rand(b.depositCents)} deposit</Link>
          <Link className="btn alt" href={`/bookings/${b.id}/cancel`}>Cancel</Link>
        </>
      )}

      {b.status === "WAITING" && (
        <>
          <div className="row between"><h2>Your spot</h2><span className="pill ok"><span className="dot" />{depositLine(b)}</span></div>
          {b.queueDay.status === "PAUSED" && (
            <div className="banner">{b.vendor.name} is paused{b.queueDay.pauseReason ? ` (${b.queueDay.pauseReason.toLowerCase()})` : ""}. Your time has been updated.</div>
          )}
          <div className="ticket">
            <div className="row between"><span>{b.vendor.name} · {title}</span><span className="mono" style={{ whiteSpace: "nowrap" }}>#{b.ref}</span></div>
            <div className="row" style={{ alignItems: "flex-end", gap: 12 }}>
              <span className="big">{ahead}</span>
              <span style={{ paddingBottom: 6, fontWeight: 600 }}>{ahead === 1 ? "person" : "people"} ahead of you</span>
            </div>
            <div className="ahead">{Array.from({ length: Math.min(ahead, 12) }, (_, i) => <i key={i} />)}<i className="you" /></div>
            <div className="row between small"><span>Estimated turn</span><b className="mono">{time(eta)}</b></div>
          </div>
          <div className="stack">
            <div className="small muted">Show this code when you arrive</div>
            <div className="code">{b.checkInCode}</div>
          </div>
          <div className="card stack small">
            <div className="row between"><span>Reminders</span><span className="muted">1 hour and 20 minutes before</span></div>
            <div className="row between"><span>Sent by</span><span className="muted">{channels(user)}</span></div>
            <Link href="/account" className="muted">Change notification settings</Link>
          </div>
          {!b.movedBack ? <Link className="btn alt" href={`/bookings/${b.id}/move`}>Move my spot back</Link> : <button className="btn alt" disabled>Moved back once</button>}
          <Link className="btn warn" href={`/bookings/${b.id}/cancel`}>Cancel booking</Link>
          <p className="small muted center">
            {refundOnCancel(new Date(), eta, b.vendor.refundWindowMins)
              ? `Cancel now for a full refund. Within ${b.vendor.refundWindowMins / 60} hours of your turn the deposit is kept.`
              : "You're within the refund window, so cancelling now keeps the deposit with the shop."}
          </p>
        </>
      )}

      {b.status === "CALLED" && b.calledAt && (
        <>
          <div className="called">
            <div className="small" style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>It&apos;s your turn</div>
            <h2 style={{ fontSize: 26 }}>{b.vendor.name} is ready for you</h2>
            {b.arrived ? <p>You&apos;re checked in. Take a seat.</p> : (
              <>
                <Countdown until={new Date(b.calledAt.getTime() + ARRIVAL_WINDOW_MINS * 60_000).toISOString()} />
                <div className="small">Arrive within {ARRIVAL_WINDOW_MINS} minutes or your spot and deposit go to the next person.</div>
              </>
            )}
          </div>
          <div className="card row between"><span>Your check-in code</span><b className="mono" style={{ fontSize: 22, letterSpacing: ".15em" }}>{b.checkInCode}</b></div>
          <a className="btn alt" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.vendor.address)}`} target="_blank" rel="noreferrer">Directions</a>
        </>
      )}

      {b.status === "IN_SERVICE" && (
        <div className="card stack center"><h2>You&apos;re in the chair</h2><p className="muted">Enjoy your {b.service.name.toLowerCase()}.</p></div>
      )}

      {b.status === "DONE" && (
        <>
          <h2>Your visit to {b.vendor.name}</h2>
          <div className="card stack">
            <div className="row between"><span>{b.service.name}</span><b className="mono">{rand(b.priceCents)}</b></div>
            {b.depositCents > 0 && <div className="row between"><span>Deposit applied</span><b className="mono">−{rand(b.depositCents)}</b></div>}
            <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}><span>Paid at shop</span><b className="mono">{rand(b.priceCents - b.depositCents)}</b></div>
          </div>
          {b.review ? (
            <div className="card small"><b>Your review: {"★".repeat(b.review.rating)}</b>{b.review.text && <><br />{b.review.text}</>}</div>
          ) : (
            <form action={reviewAction} className="stack" style={{ gap: 12 }}>
              <input type="hidden" name="bookingId" value={b.id} />
              <h3>Rate {b.vendor.name}</h3>
              <div className="stars">
                {[5, 4, 3, 2, 1].map((n) => (
                  <span key={n} style={{ display: "contents" }}>
                    <input type="radio" id={`star${n}`} name="rating" value={n} defaultChecked={n === 5} />
                    <label htmlFor={`star${n}`} aria-label={`${n} stars`}>★</label>
                  </span>
                ))}
              </div>
              <label className="f">Leave a review (optional)<textarea className="i" name="text" rows={3} maxLength={500} /></label>
              <Submit>Post review</Submit>
            </form>
          )}
          <Link className="btn alt" href={`/v/${b.vendor.slug}`}>Book again</Link>
        </>
      )}

      {(b.status === "NO_SHOW" || b.status === "CANCELLED") && (
        <>
          <h2>{b.status === "NO_SHOW" ? "You missed your turn" : "Booking cancelled"}</h2>
          <div className="card stack small">
            <span>{b.vendor.name} · {title}</span>
            <span className="muted">{depositLine(b)}</span>
          </div>
          <Link className="btn alt" href={`/v/${b.vendor.slug}`}>Book again</Link>
        </>
      )}
    </main>
  );
}

function channels(u: { consentReminders: boolean; notifySms: boolean; notifyWhatsapp: boolean }): string {
  const c = ["Push"];
  if (u.consentReminders && u.notifySms) c.push("SMS");
  if (u.consentReminders && u.notifyWhatsapp) c.push("WhatsApp");
  return c.join(" · ");
}
