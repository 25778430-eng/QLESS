import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand, shortDate } from "@/lib/format";
import { SetRow } from "@/components/SetRow";
import { getSettings } from "@/lib/settings";
import { planState } from "@/lib/plans";
import { requiredDocs } from "@/lib/verification";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { signOutAction } from "@/app/(customer)/account/actions";
import { upgradeToVerified } from "../actions";
import { typeInfo } from "@/lib/business-types";
import { ThemeButton } from "@/components/ThemeButton";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const dynamic = "force-dynamic";

/** The vendor's business hub: shop, money, documents and their own profile in one place. */
const TABS = [["work", "Work"], ["privacy", "Privacy"]] as const;

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="setgroup"><h4>{title}</h4><div className="block">{children}</div></section>;
}

export default async function VendorAccount({ searchParams }: { searchParams: { error?: string; notice?: string; tab?: string } }) {
  const tab = searchParams.tab === "privacy" ? "privacy" : "work";
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
      <div className="idbar">
        <span className="sq">{(vendor.name.trim()[0] ?? "Q").toUpperCase()}</span>
        <div className="grow" style={{ minWidth: 0 }}>
          <b className="ell">{vendor.name}</b>
          <span className="ell">
            {vendor.status === "APPROVED" ? (vendor.level === "VERIFIED" ? "Verified" : "Basic") : vendor.status === "PENDING" ? "Waiting for approval" : "Not approved"}
            {" · "}{typeInfo(vendor.businessType).label} · {user.name}
          </span>
        </div>
        <ThemeButton initial={parseTheme(cookies().get(THEME_COOKIE)?.value)} />
      </div>
      <nav className="seg two" aria-label="Account sections">
        {TABS.map(([t, label]) => <Link key={t} href={`/vendor/account?tab=${t}`} aria-current={tab === t ? "page" : undefined}>{label}</Link>)}
      </nav>
      <Messages searchParams={searchParams} />

      {tab === "work" && (
        <>
      {vendor.level === "BASIC" && (
        <div className="card stack">
          <b>Become Verified</b>
          <span className="small muted">Take deposits and get paid out by Qless.</span>
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

      <Group title="Shop">
        <SetRow icon="chart" title="Summary" sub="Served, no-shows and takings" href="/vendor/summary" />
        <SetRow icon="team" title="My team" sub={staff.length ? `${staff.length} staff` : "Add your staff"} href="/vendor/team" />
        <SetRow icon="tag" title="Services and prices" sub={services.length ? `${services.length} services · from ${rand(cheapest)}` : "Add your first service"} href="/vendor/services" />
        <SetRow icon="pin" title="Shop profile" sub={`${vendor.openTime} to ${vendor.closeTime} · ${vendor.address}`} href="/vendor/setup" />
        <SetRow icon="photo" title="Photos" sub="Show customers your work" href="/vendor/photos" />
        <SetRow icon="qr" title="QR code and poster" sub="Customers scan it to join" href="/vendor/qr" />
        <SetRow icon="tv" title="Waiting-room TV" sub="Who's being served and who's next" href="/vendor/tv" />
        {typeInfo(vendor.businessType).jobs && <SetRow icon="wrench" title="Job cards" sub="Repairs, quotes and collections" href="/vendor/jobs" />}
      </Group>

      <Group title="Money">
        <SetRow icon="bank" title="Bank account" sub={vendor.level !== "VERIFIED" ? "For Verified shops" : vendor.bankAccountNo ? `${vendor.bankName} ····${vendor.bankAccountNo.slice(-4)}` : "Add your bank account"} href="/vendor/money" />
        {vendor.level === "VERIFIED" && <SetRow icon="card" title="Payouts" sub="Earned, paid out and due" href="/vendor/payouts" />}
        <SetRow icon="calendar" title="Qless plan" sub={planText} href="/vendor/plan" />
      </Group>

      <Group title="Documents">
        <SetRow icon="doc" title="My documents" sub={`${approvedDocs} of ${needed.length} approved · view or replace`} href="/vendor/documents" />
      </Group>

      <Group title="You">
        <SetRow icon="person" title="My settings" sub="Name, notifications and language" href="/account" />
        <SetRow icon="switch" title="Switch to client mode" sub="Find and book other places" href="/discover" />
      </Group>

        </>
      )}

      {tab === "privacy" && (
        <div className="block">
          <SetRow icon="help" title="Help" href="/help" external />
          <SetRow icon="shield" title="Vendor data agreement" href="/vendor-agreement" external />
          <SetRow icon="lock" title="Privacy policy" href="/privacy" external />
          <SetRow icon="doc" title="POPIA and PAIA" href="/paia" external />
          <SetRow icon="download" title="Download my data" href="/api/me/export" external />
          <SetRow icon="doc" title="Terms of use" href="/terms" external />
        </div>
      )}
      <form action={signOutAction}><Submit className="btn alt">Sign out</Submit></form>
    </main>
  );
}
