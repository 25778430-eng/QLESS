import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { amountDue } from "@/lib/fees";
import { appUrl } from "@/lib/http";
import { payfastConfigured, paymentForm } from "@/lib/payfast";
import { Submit } from "@/components/Submit";
import { testPayAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function Pay({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const b = await db.booking.findFirst({
    where: { id: params.id, customerId: user.id },
    include: { vendor: true, service: true, staff: true },
  });
  if (!b) notFound();
  if (b.status !== "PENDING_PAYMENT") redirect(`/bookings/${b.id}`);
  const due = amountDue(b);
  const live = payfastConfigured();
  const form = live
    ? paymentForm({ bookingId: b.id, ref: b.ref, amountCents: due, itemName: `${b.vendor.name}: ${b.service.name} ${b.feeCents > 0 ? "deposit and booking fee" : "deposit"}`, customerPhone: user.phone, appUrl: appUrl() })
    : null;

  return (
    <main className="main">
      <h2>{b.depositCents > 0 ? "Confirm and pay deposit" : "Confirm and pay booking fee"}</h2>
      <div className="card stack">
        <div className="row between"><span className="muted">Shop</span><b>{b.vendor.name}</b></div>
        <div className="row between"><span className="muted">Service</span><b>{b.service.name}</b></div>
        <div className="row between"><span className="muted">With</span><b>{b.staff?.name ?? "Anyone available"}</b></div>
        <div className="row between"><span className="muted">Price</span><b className="mono">{rand(b.priceCents)}</b></div>
        <div className="row between"><span className="muted">Deposit now</span><b className="mono">{rand(b.depositCents)}</b></div>
        {b.feeCents > 0 && <div className="row between"><span className="muted">Qless booking fee</span><b className="mono">{rand(b.feeCents)}</b></div>}
        {b.feeCents > 0 && <div className="row between"><b>Total to pay now</b><b className="mono">{rand(due)}</b></div>}
        <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}><span className="muted">Pay at the shop</span><b className="mono">{rand(b.priceCents - b.depositCents)}</b></div>
      </div>
      <div className="fill small stack" style={{ gap: 6 }}>
        <b>Deposit rules</b>
        <span>The deposit comes off your final price.</span>
        <span>Cancel {b.vendor.refundWindowMins / 60} hours or more before your turn for a full refund.</span>
        <span>If you&apos;re called and don&apos;t arrive within 15 minutes, you lose your spot and the deposit.</span>
        {b.feeCents > 0 && <span>The {rand(b.feeCents)} booking fee goes to Qless, isn&apos;t part of the price and isn&apos;t refunded.</span>}
      </div>
      {form ? (
        <form action={form.action} method="post" className="stack">
          {form.fields.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <button className="btn">Pay {rand(due)} with PayFast</button>
          <p className="small muted center">Card, Instant EFT, SnapScan or Zapper via PayFast</p>
        </form>
      ) : process.env.NODE_ENV !== "production" ? (
        <form action={testPayAction} className="stack">
          <input type="hidden" name="bookingId" value={b.id} />
          <div className="banner">PayFast keys aren&apos;t set yet, so this is a test payment. No money moves.</div>
          <Submit>Approve test payment of {rand(due)}</Submit>
        </form>
      ) : (
        <div className="error">Payments aren&apos;t set up yet. Please try again later.</div>
      )}
    </main>
  );
}
