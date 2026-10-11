import { db } from "@/lib/db";
import { markPaid } from "@/lib/bookings";
import { payfastConfigured, verifyItn } from "@/lib/payfast";

/** PayFast ITN: confirms a deposit payment server-to-server. */
export async function POST(req: Request) {
  if (!payfastConfigured()) return new Response("Payments not configured", { status: 503 });
  const raw = await req.text();
  const { ok, data } = await verifyItn(raw);
  if (!ok) {
    console.error("[payfast] ITN failed verification", data.m_payment_id);
    return new Response("Invalid", { status: 400 });
  }
  if (data.merchant_id !== process.env.PAYFAST_MERCHANT_ID) return new Response("Wrong merchant", { status: 400 });
  const booking = await db.booking.findUnique({ where: { id: data.m_payment_id ?? "" } });
  if (!booking) return new Response("Unknown booking", { status: 404 });
  const paidCents = Math.round(Number(data.amount_gross) * 100);
  if (paidCents !== booking.depositCents) {
    console.error("[payfast] amount mismatch", booking.id, paidCents, booking.depositCents);
    return new Response("Amount mismatch", { status: 400 });
  }
  if (data.payment_status === "COMPLETE") await markPaid(booking.id, data.pf_payment_id ?? null);
  return new Response("OK");
}
