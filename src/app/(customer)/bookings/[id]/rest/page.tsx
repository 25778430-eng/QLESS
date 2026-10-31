import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { canPayRest, restDue } from "@/lib/fees";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/http";
import { REST_PREFIX, payfastConfigured, paymentForm } from "@/lib/payfast";
import { Submit } from "@/components/Submit";
import { testRestPayAction } from "../../actions";

export const dynamic = "force-dynamic";

/** Pay the rest of the price in the app, after the service has started. */
export default async function PayRest({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const b = await db.booking.findFirst({ where: { id: params.id, customerId: user.id }, include: { vendor: true, service: true } });
  if (!b) notFound();
  if (!canPayRest(await getSettings(), b.vendor, b)) redirect(`/bookings/${b.id}`);
  const due = restDue(b);
  const form = payfastConfigured()
    ? paymentForm({ bookingId: b.id, ref: b.ref, amountCents: due, itemName: `${b.vendor.name}: ${b.service.name}`, customerPhone: user.phone, appUrl: appUrl(), paymentId: REST_PREFIX + b.id, description: `Qless payment ${b.ref}` })
    : null;

  return (
    <main className="main">
      <h2>Pay the rest</h2>
      <div className="card stack">
        <div className="row between"><span className="muted">Shop</span><b>{b.vendor.name}</b></div>
        <div className="row between"><span className="muted">Service</span><b>{b.service.name}</b></div>
        <div className="row between"><span className="muted">Price</span><b className="mono">{rand(b.priceCents)}</b></div>
        {b.priceCents - due > 0 && <div className="row between"><span className="muted">Already paid</span><b className="mono">− {rand(b.priceCents - due)}</b></div>}
        <div className="row between" style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}><b>To pay</b><b className="mono">{rand(due)}</b></div>
      </div>
      {form ? (
        <form action={form.action} method="post" className="stack">
          {form.fields.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <button className="btn">Pay {rand(due)} with PayFast</button>
        </form>
      ) : process.env.NODE_ENV !== "production" ? (
        <form action={testRestPayAction} className="stack">
          <input type="hidden" name="bookingId" value={b.id} />
          <div className="banner">PayFast keys aren&apos;t set yet, so this is a test payment. No money moves.</div>
          <Submit>Approve test payment of {rand(due)}</Submit>
        </form>
      ) : (
        <div className="error">Payments aren&apos;t set up yet. Please pay at the shop.</div>
      )}
    </main>
  );
}
