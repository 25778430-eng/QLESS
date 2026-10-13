import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Nav, CUSTOMER_NAV, STAFF_NAV } from "@/components/Nav";
import { currentUser, staffFor } from "@/lib/auth";
import { initials } from "@/lib/format";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const isStaff = user ? (await staffFor(user)).length > 0 : false;
  return (
    <>
      <header className="topbar">
        <Logo />
        {user ? <Link className="avatar sm" href="/account" aria-label="Account">{initials(user.name)}</Link> : <a className="btn sm" href="/signin">Sign in</a>}
      </header>
      {children}
      {user && <Nav items={isStaff ? STAFF_NAV : CUSTOMER_NAV} />}
    </>
  );
}
