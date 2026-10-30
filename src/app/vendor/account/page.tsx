import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone, rand, shortDate } from "@/lib/format";
import { ProfileHead, SetGroup, SetRow } from "@/components/SetRow";
import { getSettings } from "@/lib/settings";
import { planState } from "@/lib/plans";
import { requiredDocs } from "@/lib/verification";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { signOutAction } from "@/app/(customer)/account/actions";
import { upgradeToVerified } from "../actions";
import { typeInfo } from "@/lib/business-types";

export const dynamic = "force-dynamic";

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
    <main className="main app">
      <ProfileHead
        letter={(vendor.name.trim()[0] ?? "Q").toUpperCase()}
        name={vendor.name}
        lines={[vendor.address, `${user.name} · ${prettyPhone(user.phone)}`]}
        pills={<>
          {vendor.status === "APPROVED" ? (
            <span className={`pill ${vendor.level === "VERIFIED" ? "ok" : ""}`}>{vendor.level === "VERIFIED" ? "Verified" : "Basic"}</span>
          ) : (
            <span className={`pill ${vendor.status === "PENDING" ? "sig" : "bad"}`}>{vendor.status === "PENDING" ? "Waiting for approval" : "Not approved"}</span>
          )}
          <span className="pill">{typeInfo(vendor.businessType).label}</span>
        </>}
      />
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

      <SetGroup title="Shop">
        <SetRow icon="chart" title="Summary" sub="Served, no-shows and takings" href="/vendor/summary" />
        <SetRow icon="team" title="My team" sub={staff.length ? `${staff.length} staff` : "Add your staff"} href="/vendor/team" />
        <SetRow icon="tag" title="Services and prices" sub={services.length ? `${services.length} services · from ${rand(cheapest)}` : "Add your first service"} href="/vendor/services" />
        <SetRow icon="pin" title="Shop profile" sub={`${vendor.openTime} to ${vendor.closeTime} · ${vendor.address}`} href="/vendor/setup" />
        <SetRow icon="photo" title="Photos" sub="Show customers your work" href="/vendor/photos" />
        <SetRow icon="qr" title="QR code and poster" sub="Customers scan it to join" href="/vendor/qr" />
        <SetRow icon="tv" title="Waiting-room TV" sub="Who's being served and who's next" href="/vendor/tv" />
        {typeInfo(vendor.businessType).jobs && <SetRow icon="wrench" title="Job cards" sub="Repairs, quotes and collections" href="/vendor/jobs" />}
      </SetGroup>

      <SetGroup title="Money">
        <SetRow icon="bank" title="Bank account" sub={vendor.level !== "VERIFIED" ? "For Verified shops" : vendor.bankAccountNo ? `${vendor.bankName} ····${vendor.bankAccountNo.slice(-4)}` : "Add your bank account"} href="/vendor/money" />
        {vendor.level === "VERIFIED" && <SetRow icon="card" title="Payouts" sub="Earned, paid out and due" href="/vendor/payouts" />}
        <SetRow icon="calendar" title="Qless plan" sub={planText} href="/vendor/plan" />
      </SetGroup>

      <SetGroup title="Documents">
        <SetRow icon="doc" title="My documents" sub={`${approvedDocs} of ${needed.length} approved · view or replace`} href="/vendor/documents" />
      </SetGroup>

      <SetGroup title="You">
        <SetRow icon="person" title="My settings" sub="Profile, notifications, language, look" href="/account" />
        <SetRow icon="switch" title="Switch to client mode" sub="Find and book other places" href="/discover" />
      </SetGroup>

      <SetGroup title="More">
        <SetRow icon="help" title="Help" href="/help" external />
        <SetRow icon="shield" title="Vendor data agreement" href="/vendor-agreement" external />
      </SetGroup>
      <form action={signOutAction}><Submit className="btn alt">Sign out</Submit></form>
    </main>
  );
}
