import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { aheadOf, bookedFor, loadQueue } from "@/lib/bookings";
import { appUrl } from "@/lib/http";
import { longDate, rand, time } from "@/lib/format";
import { JOB_LABEL, JOB_STAGES, typeInfo, type JobStage } from "@/lib/business-types";
import { Logo } from "@/components/Logo";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/**
 * A ticket anyone with the link can follow: walk-ins get it by SMS or on paper.
 * Shows no names or numbers, only the ticket, the place in the queue and the time.
 */
export default async function Ticket({ params, searchParams }: { params: { ref: string }; searchParams: { print?: string } }) {
  const b = await db.booking.findUnique({ where: { ref: params.ref.toUpperCase() }, include: { vendor: true, queueDay: true, service: true } });
  if (!b) notFound();
  const view = await loadQueue(b.queueDay);
  const eta = view.etas.get(b.id);
  const ahead = aheadOf(view, b.id);
  const url = `${appUrl()}/t/${b.ref}`;
  const qr = await QRCode.toDataURL(url, { width: 360, margin: 1 });
  const print = searchParams.print === "1";
  const info = typeInfo(b.vendor.businessType);
  const live = ["WAITING", "CALLED", "IN_SERVICE"].includes(b.status);
  const stageAt = JOB_STAGES.indexOf((b.jobStage ?? "") as JobStage);

  const state =
    b.readyAt && live ? (b.plate ? "Your car is ready" : "Ready to collect")
    : b.status === "CALLED" ? "It's your turn"
    : b.status === "IN_SERVICE" ? (b.jobStage ? JOB_LABEL[b.jobStage as JobStage] : "Being served")
    : b.status === "WAITING" ? (b.scheduledAt ? `Booked for ${bookedFor(b)}` : `${ahead} ahead of you`)
    : b.status === "DONE" ? "Done. Thanks for visiting"
    : b.status === "PENDING_PAYMENT" ? "Waiting for payment"
    : "This ticket is closed";

  return (
    <main className="main">
      {live && !print && <AutoRefresh seconds={20} />}
      <div className="tkt">
        <div className="tkt-top">
          <div className="row between"><Logo size={26} /><span className="k">{longDate(b.createdAt)}</span></div>
          <div className="k">{b.vendor.name}</div>
          <div className="tkt-no">{b.ticketNo ?? b.ref}</div>
          <div className="k">{b.service.name}{b.optionLabel ? ` · ${b.optionLabel}` : ""}{b.plate ? ` · ${b.plate}` : ""}</div>
        </div>
        <div className="tkt-cut" aria-hidden />
        <div className="tkt-bot">
          <b style={{ fontSize: 18 }}>{state}</b>
          {b.status === "WAITING" && eta && !b.scheduledAt && <span>Your turn about <b className="mono">{time(eta)}</b></span>}
          {b.status === "CALLED" && <span>Go to the {info.station} now.</span>}
          {b.jobStage && stageAt >= 0 && (
            <div className="steps">{JOB_STAGES.map((s, i) => <span key={s} className={i <= stageAt ? "on" : ""}>{JOB_LABEL[s]}</span>)}</div>
          )}
          {b.jobStage === "QUOTE" && b.quoteCents && (
            <span>Quote {rand(b.quoteCents)}{b.quoteNote ? `: ${b.quoteNote}` : ""}. {b.quoteApproved === true ? "Approved." : b.quoteApproved === false ? "Declined." : "Tell the shop yes or no."}</span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tkt-qr" src={qr} alt="Scan to follow this ticket" />
          <span className="small muted">Scan to follow your place · {url.replace(/^https?:\/\//, "")}</span>
          <span className="small muted mono">Ref {b.ref}</span>
        </div>
      </div>
      {print && <PrintButton label="Print ticket" auto />}
    </main>
  );
}
