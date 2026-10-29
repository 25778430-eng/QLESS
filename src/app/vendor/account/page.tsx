import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { initials, prettyPhone, rand, shortDate } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { planState } from "@/lib/plans";
import { requiredDocs } from "@/lib/verification";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { signOutAction } from "@/app/(customer)/account/actions";
import { saveBank, upgradeToVerified } from "../actions";

export const dynamic = "force-dynamic";

function Row({ href, title, sub }: { href: string; title: string; sub: string }) {
  return <Link className="li" href={href}><span className="grow"><b>{title}</b><span>{sub}</span></span><span className="chev">›</span></Link>;
}

/** The vendor's business hub: shop, money, documents and their own profile in one place. */
export default async function VendorAccount({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { user, vendor } = await requireVendor();
  const settings = await getSettings();
  const [staff, services, docs] = await Promise.all([
    db.staff.findMany({ where: { vendorId: vendor.id, active: true } }),
    db.service.findMany({ where: { vendorId: vendor.id, active: true } }),
    db.document.findMany({ where: { vendorId: vendor.id }, select: { kind: true, status: true } }),
  ]);
  const plan = planState(vendor, settings);
  const needed = requiredDocs(vendor.level, settings);
  const approvedDocs = needed.filter((k) => docs.some((d) => d.kind === k && d.status === "APPROVED")).length;
  const cheapest = services.length ? Math.min(...services.map((s) => s.priceCents)) : 0;
  const planText =
    plan.kind === "OFF" ? "No monthly plan needed right now" :
    plan.kind === "WAIVED" ? "Waived by Qless" :
    plan.kind === "ACTIVE" ? `${rand(settings.planPriceCents)} a month · paid to ${shortDate(plan.until)}` :
    plan.kind === "TRIAL" ? `Free trial to ${shortDate(plan.until)}` : "Trial ended · subscribe to stay listed";

  return (
    <main className="main">
      <div className="prof">
        <span className="avatar">{initials(vendor.name)}</span>
        <div className="stack" style={{ gap: 4 }}>
          <h2>{vendor.name}</h2>
          <div className="row wrap" style={{ gap: 6 }}>
            {vendor.status === "APPROVED" ? (
              <span className={`pill ${vendor.level === "VERIFIED" ? "ok" : ""}`}><span className="dot" />{vendor.level === "VERIFIED" ? "Verified" : "Basic · not verified"}</span>
            ) : (
              <span className={`pill ${vendor.status === "PENDING" ? "sig" : "bad"}`}>{vendor.status === "PENDING" ? "Waiting for approval" : "Not approved"}</span>
            )}
            {plan.kind !== "OFF" && <span className="pill">{plan.kind === "ACTIVE" ? `Plan paid to ${shortDate(plan.until)}` : plan.kind === "TRIAL" ? "Free trial" : plan.kind === "WAIVED" ? "Plan waived" : "Plan needed"}</span>}
          </div>
        </div>
      </div>
      <Messages searchParams={searchParams} />

      {vendor.level === "BASIC" && (
        <div className="card stack">
          <b>Become Verified</b>
          <span className="small muted">Verified shops can take deposits, which cuts no-shows, and get paid out by Qless. You&apos;ll need any ID{settings.requireBank ? ", a bank letter" : ""}{settings.requireAddress ? " and proof of address" : ""}.</span>
          {vendor.upgradeRequested ? (
            <span className="pill sig" style={{ alignSelf: "flex-start" }}>Sent to Qless for checking</span>
          ) : (
            <div className="two">
              <Link className="btn alt" href="/vendor/documents?level=VERIFIED">Upload documents</Link>
              <form action={upgradeToVerified}><Submit>Ask to upgrade</Submit></form>
            </div>
          )}
        </div>
      )}

      <div className="lbl">Your business</div>
      <div className="list">
        <Row href="/vendor/setup" title="Shop profile and hours" sub={`${vendor.address} · ${vendor.openTime} to ${vendor.closeTime}`} />
        <Row href="/vendor/setup#services" title="Services and prices" sub={services.length ? `${services.length} services · from ${rand(cheapest)}` : "Add your first service"} />
        <Row href="/vendor/setup#staff" title="Staff" sub={staff.length ? `${staff.length} staff · ${staff.filter((s) => s.phone).length} with their own login` : "Add your team"} />
        <Row href="/vendor/qr" title="QR code and poster" sub="Customers scan it to join your queue" />
      </div>

      <div className="lbl">Money</div>
      <div className="list">
        {vendor.level === "VERIFIED" && (
          <details className="li" style={{ display: "block" }}>
            <summary className="row between" style={{ listStyle: "none" }}>
              <span className="grow"><b>Payouts and bank</b><span>{vendor.bankAccountNo ? `${vendor.bankName} ····${vendor.bankAccountNo.slice(-4)}` : "Add your bank account"}</span></span>
              <span className="chev">›</span>
            </summary>
            <form action={saveBank} className="stack" style={{ marginTop: 10 }}>
              <label className="f">Bank<input className="i" name="bankName" defaultValue={vendor.bankName ?? ""} /></label>
              <label className="f">Account holder<input className="i" name="bankAccountName" defaultValue={vendor.bankAccountName ?? ""} /></label>
              <label className="f">Account number<input className="i mono" name="bankAccountNo" inputMode="numeric" defaultValue={vendor.bankAccountNo ?? ""} /></label>
              <Submit className="btn sm">Save bank details</Submit>
            </form>
          </details>
        )}
        <Row href="/vendor/plan" title="Qless plan" sub={planText} />
        <Row href="/vendor/documents" title="Documents" sub={`${approvedDocs} of ${needed.length} approved`} />
        <Row href="/vendor/summary" title="Daily summary" sub="Served, no-shows, deposits and takings" />
      </div>

      <div className="lbl">You</div>
      <div className="list">
        <Row href="/account" title={user.name} sub={user.email ?? prettyPhone(user.phone)} />
        <Row href="/discover" title="Switch to customer view" sub="Book at other shops" />
      </div>

      <div className="lbl">Help</div>
      <div className="list">
        <Row href="/help" title="Help and contact" sub="Payouts, staff logins and listings" />
        <Row href="/vendor-agreement" title="Vendor data agreement" sub="How to handle your customers' details" />
      </div>
      <form action={signOutAction}><Submit className="btn alt">Sign out</Submit></form>
    </main>
  );
}
