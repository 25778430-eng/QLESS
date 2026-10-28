import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadQueue } from "@/lib/bookings";
import { refundOnCancel } from "@/lib/queue";
import { rand } from "@/lib/format";
import { Submit } from "@/components/Submit";
import { cancelAction } from "../../actions";

export default async function Cancel(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const user = await requireUser();
  const b = await db.booking.findFirst({ where: { id: params.id, customerId: user.id }, include: { queueDay: true, vendor: true } });
  if (!b) notFound();
  if (!["PENDING_PAYMENT", "WAITING", "CALLED"].includes(b.status)) redirect(`/bookings/${b.id}`);
  const view = await loadQueue(b.queueDay);
  const paid = b.depositStatus === "PAID";
  const refund = paid && b.depositCents > 0 && b.status === "WAITING" && refundOnCancel(new Date(), view.etas.get(b.id), b.vendor.refundWindowMins);
  const hours = b.vendor.refundWindowMins / 60;
  return (
    <main className="main">
      <h2>Cancel booking?</h2>
      <div className="card stack">
        {!paid && b.status === "PENDING_PAYMENT" ? (
          <span>You haven&apos;t paid yet, so nothing is charged.</span>
        ) : !paid || b.depositCents === 0 ? (
          <span>There&apos;s no deposit to refund.{b.feeCents > 0 ? " The booking fee isn't refunded." : ""}</span>
        ) : refund ? (
          <>
            <span className="pill ok" style={{ alignSelf: "flex-start" }}>Full refund</span>
            <span>Your turn is more than {hours} hours away, so your <b className="mono">{rand(b.depositCents)}</b> deposit goes back to you within 3–5 working days.{b.feeCents > 0 && <> The {rand(b.feeCents)} booking fee isn&apos;t refunded.</>}</span>
          </>
        ) : (
          <>
            <span className="pill bad" style={{ alignSelf: "flex-start" }}>No refund</span>
            <span>Your turn is less than {hours} hours away, so the <b className="mono">{rand(b.depositCents)}</b> deposit is kept by {b.vendor.name}.</span>
          </>
        )}
      </div>
      <form action={cancelAction}>
        <input type="hidden" name="bookingId" value={b.id} />
        <Submit className="btn warn">{refund ? "Yes, cancel and refund" : "Yes, cancel"}</Submit>
      </form>
      <Link className="btn alt" href={`/bookings/${b.id}`}>Keep my spot</Link>
    </main>
  );
}
