import { Logo } from "@/components/Logo";
import { Nav, CUSTOMER_NAV, VENDOR_NAV } from "@/components/Nav";
import { currentUser } from "@/lib/auth";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <>
      <header className="topbar">
        <Logo />
        {user ? <span className="small muted">{user.name}</span> : <a className="btn sm" href="/signin">Sign in</a>}
      </header>
      {children}
      {user && <Nav items={user.role === "VENDOR" ? [...CUSTOMER_NAV.slice(0, 2), ...VENDOR_NAV.slice(0, 1), CUSTOMER_NAV[2]] : CUSTOMER_NAV} />}
    </>
  );
}
