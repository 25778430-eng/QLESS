import { requireSuperAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { SubHead } from "@/components/SetRow";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { MAX_FEE_CENTS } from "@/lib/fees";
import { saveBookingFee } from "../actions";

export const dynamic = "force-dynamic";

export default async function Fee({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  await requireSuperAdmin();
  const settings = await getSettings();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fees = await db.booking.aggregate({
    where: { feeCents: { gt: 0 }, createdAt: { gte: since }, payfastPaymentId: { not: null } },
    _sum: { feeCents: true },
    _count: true,
  });
  return (
    <>
      <AdminHeader />
      <main className="main app">
        <SubHead back="/admin" backLabel="Admin" title="Booking fee" />
        <Messages searchParams={searchParams} />
        <form action={saveBookingFee} className="card stack">
          <div className="row between">
            <b>Customer booking fee</b>
            <span className={`pill ${settings.bookingFeeOn ? "ok" : ""}`}>{settings.bookingFeeOn ? "On" : "Off"}</span>
          </div>
          <span className="small muted">A fixed fee customers pay on top of the deposit when they book. Qless keeps it and it isn&apos;t refunded. Changes apply to new bookings only.</span>
          <div className="row">
            <label className="f grow">Fee (R)<input className="i mono" type="number" min="0" max={MAX_FEE_CENTS / 100} step="0.01" name="fee" defaultValue={settings.bookingFeeCents / 100} /></label>
            <label className="row small"><input type="checkbox" name="on" defaultChecked={settings.bookingFeeOn} /> Charge it</label>
          </div>
          <span className="small muted">Last 30 days: {rand(fees._sum.feeCents ?? 0)} from {fees._count} paid bookings.</span>
          <Submit className="btn sm">Save</Submit>
        </form>
      </main>
    </>
  );
}
