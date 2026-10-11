import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone, rand, shortDate } from "@/lib/format";
import { MAX_FEE_CENTS } from "@/lib/fees";
import { MAX_PLAN_CENTS, isFeatured, planState, type PlanState } from "@/lib/plans";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { getSettings } from "@/lib/settings";
import { approveVendor, rejectVendor, saveBookingFee, saveFeatured, savePlan, setPlanWaived } from "./actions";

function planLabel(p: PlanState): string {
  switch (p.kind) {
    case "OFF": return "Plan off";
    case "WAIVED": return "Plan waived";
    case "ACTIVE": return `Plan paid to ${shortDate(p.until)}`;
    case "TRIAL": return `Trial to ${shortDate(p.until)}`;
    case "EXPIRED": return `Hidden: no plan since ${shortDate(p.since)}`;
  }
}

/** YYYY-MM-DD in South Africa, for a date input. */
function dateInput(d: Date | null): string {
  return d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(d) : "";
}

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
  const now = new Date();
  const subscribed = await db.vendor.count({ where: { planToken: { not: null } } });
  const vendors = await db.vendor.findMany({
    where: showAll ? {} : { status: "PENDING" },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return (
    <>
      <AdminHeader current="/admin" />
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
        <form action={savePlan} className="card stack">
          <div className="row between">
            <b>Vendor monthly plan</b>
            <span className={`pill ${settings.planOn ? "ok" : ""}`}>{settings.planOn ? "On" : "Off"}</span>
          </div>
          <span className="small muted">Vendors pay monthly through a PayFast subscription. Shops without a plan are hidden from customers once their free trial ends. Switching it on starts every shop&apos;s free trial from today; new shops get theirs from approval.</span>
          <div className="row">
            <label className="f grow">Price a month (R)<input className="i mono" type="number" min="1" max={MAX_PLAN_CENTS / 100} step="0.01" name="price" defaultValue={settings.planPriceCents / 100} /></label>
            <label className="f grow">Free trial (days)<input className="i mono" type="number" min="0" max="90" step="1" name="trial" defaultValue={settings.planTrialDays} /></label>
          </div>
          <label className="row small"><input type="checkbox" name="on" defaultChecked={settings.planOn} /> Require the plan</label>
          <span className="small muted">{subscribed} shops subscribed.</span>
          <Submit className="btn sm">Save</Submit>
        </form>
        <h2>Vendors</h2>
        <a className="small" href={showAll ? "/admin" : "/admin?show=all"}>{showAll ? "Show pending only" : "Show all vendors (plan and featured settings)"}</a>
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
            {v.status === "APPROVED" && (
              <>
                <form action={setPlanWaived} className="row between">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="waived" value={v.planWaived ? "0" : "1"} />
                  <span className="small">{planLabel(planState(v, settings, now))}</span>
                  <Submit className="btn sm alt">{v.planWaived ? "Require plan" : "Waive plan"}</Submit>
                </form>
                <form action={saveFeatured} className="stack" style={{ gap: 8 }}>
                  <input type="hidden" name="id" value={v.id} />
                  <div className="row between">
                    <label className="row small"><input type="checkbox" name="featured" defaultChecked={v.featured} /> Featured</label>
                    {isFeatured(v, now) && <span className="pill">Featured now</span>}
                  </div>
                  <div className="row">
                    <label className="f grow">Rank (higher shows first)<input className="i mono" type="number" min="0" max="100" step="1" name="rank" defaultValue={v.featuredRank} /></label>
                    <label className="f grow">Until (optional)<input className="i" type="date" name="until" defaultValue={dateInput(v.featuredUntil)} /></label>
                  </div>
                  <label className="f">Amount paid for featuring (R, optional, shows on Money)<input className="i mono" type="number" min="0" step="0.01" name="paid" placeholder="0" /></label>
                  <Submit className="btn sm alt">Save featured</Submit>
                </form>
              </>
            )}
          </div>
        ))}
      </main>
    </>
  );
}
