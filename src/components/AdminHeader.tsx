import Link from "next/link";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/admin", label: "Settings" },
  { href: "/admin/money", label: "Money" },
  { href: "/admin/users", label: "Users" },
];

export function AdminHeader({ current }: { current: string }) {
  return (
    <header className="topbar">
      <Logo href="/admin" />
      <nav className="row small" style={{ gap: 14 }} aria-label="Admin">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={l.href === current ? "page" : undefined} style={{ fontWeight: l.href === current ? 700 : 400 }}>
            {l.label}
          </Link>
        ))}
        <Link className="muted" href="/account">Account</Link>
      </nav>
    </header>
  );
}
