import { Logo } from "@/components/Logo";
import { Nav, VENDOR_NAV } from "@/components/Nav";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const vendor = await db.vendor.findUnique({ where: { ownerId: user.id } });
  return (
    <>
      <header className="topbar">
        <Logo href="/vendor" />
        <span className="small muted">{vendor?.name ?? "New business"}</span>
      </header>
      {children}
      {vendor && <Nav items={VENDOR_NAV} />}
    </>
  );
}
