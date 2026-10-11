"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ items }: { items: Array<{ href: string; label: string }> }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={path === i.href || path.startsWith(i.href + "/") ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export const CUSTOMER_NAV = [
  { href: "/discover", label: "Find" },
  { href: "/bookings", label: "My bookings" },
  { href: "/account", label: "Account" },
];

export const VENDOR_NAV = [
  { href: "/vendor", label: "Queue" },
  { href: "/vendor/setup", label: "Setup" },
  { href: "/vendor/summary", label: "Summary" },
  { href: "/account", label: "Account" },
];
