import Link from "next/link";
import { currentUser, isSuperAdmin } from "@/lib/auth";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/admin", label: "Settings" },
  { href: "/admin/money", label: "Money", superOnly: true },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/team", label: "Team", superOnly: true },
];

export async function AdminHeader({ current }: { current: string }) {
  const user = await currentUser();
  const superAdmin = !!user && isSuperAdmin(user);
  return (
    <header className="topbar">
      <Logo href="/admin" />
      <nav className="row small" style={{ gap: 14 }} aria-label="Admin">
        {LINKS.filter((l) => superAdmin || !l.superOnly).map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.href === current ? "page" : undefined} style={{ fontWeight: l.href === current ? 700 : 400 }}>
            {l.label}
          </Link>
        ))}
        <Link className="muted" href="/account">Account</Link>
      </nav>
    </header>
  );
}
