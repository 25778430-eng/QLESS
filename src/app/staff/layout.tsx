import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Nav, STAFF_NAV } from "@/components/Nav";
import { requireStaff } from "@/lib/auth";
import { initials } from "@/lib/format";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, vendor } = await requireStaff();
  return (
    <>
      <header className="topbar">
        <Logo href="/staff" />
        <span className="row small muted">{vendor.name}<Link className="avatar sm" href="/account" aria-label="Account">{initials(user.name)}</Link></span>
      </header>
      {children}
      <Nav items={STAFF_NAV} />
    </>
  );
}
