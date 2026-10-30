import { currentUser, isSuperAdmin, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { vendorBalance } from "@/lib/money";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { SetGroup, SetRow } from "@/components/SetRow";
import { getSettings } from "@/lib/settings";
import { BUSINESS_TYPES } from "@/lib/business-types";

export const dynamic = "force-dynamic";

function OnOff({ on }: { on: boolean }) {
  return <span className={`sw ${on ? "on" : ""}`} role="img" aria-label={on ? "On" : "Off"} />;
}

/** Admin home: the numbers that matter, what needs doing, then every setting as a row. */
export default async function Admin({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  await requireAdmin();
  const me = await currentUser();
  const superAdmin = !!me && isSuperAdmin(me);
  const settings = await getSettings();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [waiting, live, users, fees, featured, deposits, payouts] = await Promise.all([
    db.vendor.findMany({ where: { OR: [{ status: "PENDING" }, { upgradeRequested: true }] }, select: { name: true }, orderBy: { createdAt: "asc" } }),
    db.vendor.count({ where: { status: "APPROVED" } }),
    db.user.count(),
    db.booking.aggregate({ where: { feeCents: { gt: 0 }, createdAt: { gte: since }, payfastPaymentId: { not: null } }, _sum: { feeCents: true } }),
    db.vendor.count({ where: { featured: true } }),
    superAdmin ? db.booking.findMany({ where: { depositCents: { gt: 0 }, depositStatus: { in: ["APPLIED", "FORFEITED"] } }, select: { vendorId: true, depositCents: true, depositStatus: true } }) : [],
    superAdmin ? db.payout.groupBy({ by: ["vendorId"], _sum: { amountCents: true } }) : [],
  ]);
  const byShop = new Map<string, typeof deposits>();
  for (const d of deposits) byShop.set(d.vendorId, [...(byShop.get(d.vendorId) ?? []), d]);
  const paidBy = new Map(payouts.map((p) => [p.vendorId, p._sum.amountCents ?? 0]));
  const dues = [...byShop.entries()].map(([id, rows]) => vendorBalance(rows, [paidBy.get(id) ?? 0]).due).filter((d) => d > 0);
  const dueTotal = dues.reduce((s, d) => s + d, 0);
  const typesOn = BUSINESS_TYPES.filter((t) => !settings.disabledTypes.includes(t)).length;

  return (
    <>
      <AdminHeader />
      <main className="main app wide">
        <div className="hello"><small>{superAdmin ? "Super admin" : "Admin"}</small>Qless HQ</div>
        <Messages searchParams={searchParams} />
        <div className="tiles">
          <a href="/admin/approvals" className={waiting.length ? "hot" : ""}><b>{waiting.length}</b><span>waiting for approval</span></a>
          <a href={superAdmin ? "/admin/shops" : "/admin/users"}><b>{live}</b><span>shops live</span></a>
          {superAdmin ? <a href="/admin/money"><b>{rand(fees._sum.feeCents ?? 0)}</b><span>booking fees · 30 days</span></a> : <a href="/admin/users"><b>{users}</b><span>people signed up</span></a>}
          {superAdmin ? <a href="/admin/money"><b>{rand(dueTotal)}</b><span>payouts due</span></a> : null}
        </div>

        <div className="cols">
        <SetGroup title="Needs you">
          <SetRow icon="doc" title="Approve shops" sub={waiting.length ? waiting.slice(0, 3).map((v) => v.name).join(", ") : "Nothing waiting"} href="/admin/approvals" badge={waiting.length ? <span className="pill sig">{waiting.length}</span> : undefined} />
          {superAdmin && <SetRow icon="bank" title="Pay out shops" sub={dues.length ? `${dues.length} shops · ${rand(dueTotal)}` : "Nothing due"} href="/admin/money" />}
        </SetGroup>

        {superAdmin && (
          <>
            <SetGroup title="Money">
              <SetRow icon="card" title="Booking fee" sub={`${rand(settings.bookingFeeCents)} per booking`} href="/admin/fee" badge={<OnOff on={settings.bookingFeeOn} />} />
              <SetRow icon="calendar" title="Monthly plan" sub={`${rand(settings.planPriceCents)} · ${settings.planTrialDays}-day trial`} href="/admin/plan" badge={<OnOff on={settings.planOn} />} />
              <SetRow icon="chart" title="Money and payouts" href="/admin/money" />
            </SetGroup>
            <SetGroup title="Rules">
              <SetRow icon="shield" title="Sign-up rules" sub={[settings.requireCipc && "CIPC", settings.requireAddress && "address", settings.requireBank && "bank", settings.allowBasic && "Basic shops allowed"].filter(Boolean).join(", ") || "Owner ID only"} href="/admin/rules" />
              <SetRow icon="shop" title="Business types" sub={`${typesOn} of ${BUSINESS_TYPES.length} on`} href="/admin/types" />
              <SetRow icon="tag" title="Shops, plans and featured" sub={`${live} live · ${featured} featured`} href="/admin/shops" />
            </SetGroup>
          </>
        )}

        <SetGroup title="People">
          <SetRow icon="person" title="Users" sub={`${users} people`} href="/admin/users" />
          {superAdmin && <SetRow icon="admin" title="Admin team" href="/admin/team" />}
        </SetGroup>
        </div>
      </main>
    </>
  );
}
