import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aheadOf, bookedFor, depositLine, loadQueue } from "@/lib/bookings";
import { JOB_LABEL, JOB_STAGES, typeInfo, type JobStage } from "@/lib/business-types";
import { ARRIVAL_WINDOW_MINS, refundOnCancel } from "@/lib/queue";
import { rand, time } from "@/lib/format";
import { amountDue, canPayRest, restDue } from "@/lib/fees";
import { getSettings } from "@/lib/settings";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Countdown } from "@/components/Countdown";
import { quoteAction, reviewAction } from "../actions";

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
  const title = `${b.service.name}${b.optionLabel ? ` (${b.optionLabel})` : ""}${b.staff ? ` with ${b.staff.name}` : ""}`;
  const info = typeInfo(b.vendor.businessType);
  const stageAt = JOB_STAGES.indexOf((b.jobStage ?? "") as JobStage);
  const payRest = canPayRest(await getSettings(), b.vendor, b);

  return (
    <main className="main">
      {live && <AutoRefresh seconds={b.status === "PENDING_PAYMENT" ? 5 : 15} />}
      <Messages searchParams={searchParams} />
      {searchParams.paid && b.status === "PENDING_PAYMENT" && <div className="fill small">Waiting for PayFast to confirm your payment…</div>}

      {payRest && (
        <div className="card stack">
          <div className="row between"><b>Pay the rest in the app</b><b className="mono">{rand(restDue(b))}</b></div>
          <Link className="btn sig" href={`/bookings/${b.id}/rest`}>Pay {rand(restDue(b))}</Link>
        </div>
      )}
      {b.restPaidAt && <div className="pill ok" style={{ alignSelf: "flex-start" }}>Paid {rand(b.restPaidCents)} in the app</div>}

      {b.status === "PENDING_PAYMENT" && (
        <>
          <h2>{b.depositCents > 0 ? "Pay your deposit" : "Pay your booking fee"}</h2>
          <p className="muted">Your spot at {b.vendor.name} is held for 15 minutes while you pay.</p>
          <Link className="btn" href={`/bookings/${b.id}/pay`}>Pay {rand(amountDue(b))}{b.feeCents > 0 ? "" : " deposit"}</Link>
          <Link className="btn alt" href={`/bookings/${b.id}/cancel`}>Cancel</Link>
        </>
      )}

      {b.status === "WAITING" && (
        <>
          <div className="row between"><h2>Your spot</h2><span className="pill ok"><span className="dot" />{depositLine(b)}</span></div>
          {b.queueDay.status === "PAUSED" && (
            <div className="banner">{b.vendor.name} is paused{b.queueDay.pauseReason ? ` (${b.queueDay.pauseReason.toLowerCase()})` : ""}. Your time has been updated.</div>
          )}
          <div className="tkt">
            <div className="tkt-top">
              <div className="row between"><span className="k">{b.vendor.name}</span><span className="k mono">#{b.ref}</span></div>
              <div className="row between" style={{ alignItems: "flex-end" }}>
                <div><div className="k">Ticket</div><div className="tkt-no">{b.ticketNo ?? b.ref}</div></div>
                {b.scheduledAt ? (
                  <div style={{ textAlign: "right" }}><div className="k">Booked for</div><b style={{ fontSize: 20 }}>{bookedFor(b)}</b></div>
                ) : (
                  <div style={{ textAlign: "right" }}><div className="k">Your turn about</div><b className="mono" style={{ fontSize: 26 }}>{time(eta)}</b></div>
                )}
              </div>
              <div className="k">{title}{b.plate ? ` · ${b.plate}` : ""}{b.extras ? ` · + ${b.extras}` : ""}</div>
            </div>
            <div className="tkt-cut" aria-hidden />
            <div className="tkt-bot">
              {b.scheduledAt ? (
                <span>Come at your time. The shop will call you when it&apos;s your turn.</span>
              ) : (
                <>
                  <b>{ahead} {ahead === 1 ? "person" : "people"} ahead of you</b>
                  <div className="ahead">{Array.from({ length: Math.min(ahead, 12) }, (_, i) => <i key={i} />)}<i className="you" /></div>
                </>
              )}
            </div>
          </div>
          {b.service.bring && <div className="fill small"><b>Bring with you:</b> {b.service.bring}</div>}
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

      {b.status === "IN_SERVICE" && b.readyAt && (
        <div className="called">
          <div className="small" style={{ fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>Ready</div>
          <h2 style={{ fontSize: 26 }}>{b.plate ? `Your car (${b.plate}) is ready` : b.item ? `Your ${b.item} is ready to collect` : "Ready to collect"}</h2>
          <p>{b.vendor.name}{b.quoteCents ? ` · amount due ${rand(b.quoteCents)}` : ""}</p>
        </div>
      )}

      {b.status === "IN_SERVICE" && !b.readyAt && b.jobStage && (
        <>
          <h2>Your {b.item ?? "repair"}</h2>
          <div className="steps">{JOB_STAGES.map((st, i) => <span key={st} className={i <= stageAt ? "on" : ""}>{JOB_LABEL[st]}</span>)}</div>
          {b.jobStage === "QUOTE" && b.quoteCents != null && (
            <div className="card stack">
              <div className="row between"><b>Quote from {b.vendor.name}</b><b className="mono">{rand(b.quoteCents)}</b></div>
              {b.quoteNote && <span className="small muted">{b.quoteNote}</span>}
              {b.quoteApproved == null ? (
                <form action={quoteAction} className="two">
                  <input type="hidden" name="bookingId" value={b.id} />
                  <button className="btn alt" name="answer" value="no">Decline</button>
                  <button className="btn" name="answer" value="yes">Approve</button>
                </form>
              ) : (
                <span className={`pill ${b.quoteApproved ? "ok" : "bad"}`}>{b.quoteApproved ? "You approved this quote" : "You declined. Collect your item from the shop."}</span>
              )}
            </div>
          )}
        </>
      )}

      {b.status === "IN_SERVICE" && !b.readyAt && !b.jobStage && (
        <div className="card stack center"><h2>You&apos;re being served</h2><p className="muted">{info.plates ? "We'll let you know the moment your car is ready." : `Enjoy your ${b.service.name.toLowerCase()}.`}</p></div>
      )}

      {b.status === "DONE" && (
        <>
          <h2>Your visit to {b.vendor.name}</h2>
          <div className="card stack">
            <div className="row between"><span>{b.service.name}{b.optionLabel ? ` (${b.optionLabel})` : ""}</span><b className="mono">{rand(b.priceCents - b.extrasCents)}</b></div>
            {b.extrasCents > 0 && <div className="row between"><span>+ {b.extras}</span><b className="mono">{rand(b.extrasCents)}</b></div>}
            {b.depositCents > 0 && <div className="row between"><span>Deposit applied</span><b className="mono">−{rand(b.depositCents)}</b></div>}
            <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}><span>{b.restPaidAt ? "Paid in the app" : payRest ? "Still to pay" : "Paid at shop"}</span><b className="mono">{rand(b.priceCents - b.depositCents)}</b></div>
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
