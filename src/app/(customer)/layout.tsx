import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { CUSTOMER_NAV, STAFF_NAV } from "@/components/nav-items";
import { currentUser, staffFor } from "@/lib/auth";
import { initials } from "@/lib/format";
import { translateNav } from "@/lib/i18n";
import { langFor } from "@/lib/lang";
import { inClientMode } from "@/lib/mode";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const staffMode = user && !inClientMode() ? (await staffFor(user)).length > 0 : false;
  return (
    <>
      <header className={user ? "topbar applike" : "topbar"}>
        <Logo />
        {user ? <Link className="avatar sm" href="/account" aria-label="Account">{initials(user.name)}</Link> : <a className="btn sm" href="/signin">Sign in</a>}
      </header>
      {children}
      {user && <Nav items={translateNav(staffMode ? STAFF_NAV : CUSTOMER_NAV, langFor(user))} />}
    </>
  );
}
