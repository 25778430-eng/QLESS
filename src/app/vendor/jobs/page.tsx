import Link from "next/link";
import { SubHead } from "@/components/SetRow";
import { requireVendor } from "@/lib/auth";
import { openJobs } from "@/lib/bookings";
import { nextStage, JOB_LABEL, JOB_STAGES, type JobStage } from "@/lib/business-types";
import { rand, shortDate } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { AutoRefresh } from "@/components/AutoRefresh";
import { doneAction, jobStageAction } from "../actions";

export const dynamic = "force-dynamic";

/** Repair job cards: every open job, over all days, with its stage and quote. */
export default async function Jobs({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { vendor } = await requireVendor();
  const jobs = await openJobs(vendor.id);
  return (
    <main className="main">
      <AutoRefresh seconds={30} />
      <SubHead back="/vendor/account" backLabel="Account" title="Job cards" />
      <Messages searchParams={searchParams} />
      {jobs.length === 0 && <p className="muted">No open jobs. Start a client from the queue and their job card appears here.</p>}
      {jobs.map((b) => {
        const stage = (b.jobStage ?? "RECEIVED") as JobStage;
        const next = nextStage(stage, b.quoteApproved);
        const at = JOB_STAGES.indexOf(stage);
        return (
          <div key={b.id} id={b.id} className="tkt">
            <div className="tkt-top">
              <div className="row between"><span className="k">{shortDate(b.createdAt)} · #{b.ref}</span><span className="k mono">{b.ticketNo}</span></div>
              <b style={{ fontSize: 20 }}>{b.item ?? b.service.name}</b>
              <span className="k">{b.customer?.name ?? b.walkInName ?? "Walk-in"} · {b.service.name}</span>
            </div>
            <div className="tkt-cut" aria-hidden />
            <div className="tkt-bot">
              <div className="steps">{JOB_STAGES.map((s, i) => <span key={s} className={i <= at ? "on" : ""}>{JOB_LABEL[s]}</span>)}</div>
              {stage === "QUOTE" && (
                <span className="small">
                  Quote {rand(b.quoteCents ?? 0)}{b.quoteNote ? ` · ${b.quoteNote}` : ""} ·{" "}
                  <b>{b.quoteApproved === true ? "approved" : b.quoteApproved === false ? "declined: return the item" : "waiting for the customer"}</b>
                </span>
              )}
              {(stage === "CHECKING" || (stage === "QUOTE" && b.quoteApproved === false)) && (
                <form action={jobStageAction} className="stack">
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="stage" value="QUOTE" />
                  <div className="row">
                    <input className="i mono" name="quote" type="number" min="1" step="1" placeholder="Quote (R)" required />
                    <Submit className="btn sm">Send quote</Submit>
                  </div>
                  <input className="i" name="note" placeholder="What it covers, e.g. new screen and labour" maxLength={200} />
                </form>
              )}
              <div className="row wrap">
                {next && next !== "QUOTE" && (
                  <form action={jobStageAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="stage" value={next} />
                    <Submit className={next === "READY" ? "btn sm sig" : "btn sm"}>{next === "READY" ? "Ready to collect" : `Move to: ${JOB_LABEL[next].toLowerCase()}`}</Submit>
                  </form>
                )}
                {stage === "CHECKING" && (
                  <form action={jobStageAction}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="stage" value="WORKING" />
                    <Submit className="btn sm alt">No quote needed, start fixing</Submit>
                  </form>
                )}
                {(stage === "READY" || b.quoteApproved === false) && (
                  <form action={doneAction}><input type="hidden" name="id" value={b.id} /><Submit className="btn sm alt">Collected</Submit></form>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <Link className="btn alt" href="/vendor">Back to the queue</Link>
    </main>
  );
}
