import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { VENDOR_NAV } from "@/components/nav-items";
import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { planState } from "@/lib/plans";
import { getSettings } from "@/lib/settings";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const vendor = await db.vendor.findUnique({ where: { ownerId: user.id } });
  const plan = vendor?.status === "APPROVED" ? planState(vendor, await getSettings()) : null;
  return (
    <>
      <header className="topbar applike">
        <Logo href="/vendor" />
        <span className="small muted">{vendor?.name ?? "New business"}</span>
      </header>
      {plan?.kind === "TRIAL" && (
        <Link className="fill small" href="/vendor/plan" style={{ display: "block", margin: "0 16px" }}>Free trial until {shortDate(plan.until)}. Subscribe to the monthly plan to stay listed →</Link>
      )}
      {plan?.kind === "EXPIRED" && (
        <Link className="banner" href="/vendor/plan" style={{ display: "block", margin: "0 16px" }}>Your free trial has ended, so customers can&apos;t find you. Subscribe to the monthly plan →</Link>
      )}
      {plan?.kind === "ACTIVE" && (
        <Link className="small muted" href="/vendor/plan" style={{ display: "block", margin: "0 16px" }}>Monthly plan active until {shortDate(plan.until)} · Manage</Link>
      )}
      {children}
      {vendor && <Nav items={VENDOR_NAV} />}
    </>
  );
}
