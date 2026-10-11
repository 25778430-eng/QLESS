import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone, rand, shortDate } from "@/lib/format";
import { MAX_FEE_CENTS } from "@/lib/fees";
import { Logo } from "@/components/Logo";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { getSettings } from "@/lib/settings";
import { approveVendor, rejectVendor, saveBookingFee } from "./actions";

export const dynamic = "force-dynamic";

export default async function Admin({ searchParams }: { searchParams: { error?: string; notice?: string; show?: string } }) {
  await requireAdmin();
  const showAll = searchParams.show === "all";
  const settings = await getSettings();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const fees = await db.booking.aggregate({
    where: { feeCents: { gt: 0 }, createdAt: { gte: since }, payfastPaymentId: { not: null } },
    _sum: { feeCents: true },
    _count: true,
  });
  const vendors = await db.vendor.findMany({
    where: showAll ? {} : { status: "PENDING" },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return (
    <>
      <header className="topbar"><Logo href="/admin" /><a className="small muted" href="/account">Account</a></header>
      <main className="main">
        <div className="row between">
          <h1>Admin</h1>
          <span className="pill sig">{vendors.filter((v) => v.status === "PENDING").length} pending</span>
        </div>
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
        <h2>Vendor approvals</h2>
        <a className="small" href={showAll ? "/admin" : "/admin?show=all"}>{showAll ? "Show pending only" : "Show all vendors"}</a>
        <p className="small muted">Check each CIPC number on the CIPC BizPortal (bizportal.gov.za) before approving.</p>
        {vendors.length === 0 && <p className="muted">Nothing waiting.</p>}
        {vendors.map((v) => (
          <div key={v.id} className="card stack">
            <div className="row between"><b>{v.name}</b><span className="small muted">{shortDate(v.createdAt)}</span></div>
            <span className="small muted">{v.category} · {v.address}</span>
            <span className="small muted">Owner {v.owner.name} · <span className="mono">{prettyPhone(v.phone)}</span></span>
            <span className="mono small">CIPC {v.cipc}</span>
            {v.status === "PENDING" ? (
              <>
                <form action={approveVendor}><input type="hidden" name="id" value={v.id} /><Submit className="btn sm">Approve</Submit></form>
                <form action={rejectVendor} className="row">
                  <input type="hidden" name="id" value={v.id} />
                  <input className="i grow" name="reason" placeholder="Reason for rejecting" />
                  <Submit className="btn sm warn">Reject</Submit>
                </form>
              </>
            ) : (
              <span className={`pill ${v.status === "APPROVED" ? "ok" : "bad"}`} style={{ alignSelf: "flex-start" }}>{v.status === "APPROVED" ? "Approved" : `Rejected: ${v.rejectReason}`}</span>
            )}
          </div>
        ))}
      </main>
    </>
  );
}
