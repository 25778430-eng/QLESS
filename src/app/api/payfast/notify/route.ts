import { db } from "@/lib/db";
import { markPaid } from "@/lib/bookings";
import { amountDue } from "@/lib/fees";
import { PLAN_PREFIX, payfastConfigured, verifyItn } from "@/lib/payfast";
import { recordPlanPayment } from "@/lib/plan-billing";

/** PayFast ITN: confirms a deposit (plus any booking fee) or a vendor plan payment, server-to-server. */
export async function POST(req: Request) {
  if (!payfastConfigured()) return new Response("Payments not configured", { status: 503 });
  const raw = await req.text();
  const { ok, data } = await verifyItn(raw);
  if (!ok) {
    console.error("[payfast] ITN failed verification", data.m_payment_id);
    return new Response("Invalid", { status: 400 });
  }
  if (data.merchant_id !== process.env.PAYFAST_MERCHANT_ID) return new Response("Wrong merchant", { status: 400 });
  const paidCents = Math.round(Number(data.amount_gross) * 100);

  const id = data.m_payment_id ?? "";
  if (id.startsWith(PLAN_PREFIX)) {
    const result = await recordPlanPayment(id.slice(PLAN_PREFIX.length), data.payment_status ?? "", paidCents, data.token ?? "");
    return result === "OK" ? new Response("OK") : new Response(result, { status: 400 });
  }

  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) return new Response("Unknown booking", { status: 404 });
  if (paidCents !== amountDue(booking)) {
    console.error("[payfast] amount mismatch", booking.id, paidCents, amountDue(booking));
    return new Response("Amount mismatch", { status: 400 });
  }
  if (data.payment_status === "COMPLETE") await markPaid(booking.id, data.pf_payment_id ?? null);
  return new Response("OK");
}
