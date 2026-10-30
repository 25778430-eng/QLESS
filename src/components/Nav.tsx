"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "./nav-items";

export type { NavItem };

const ICONS: Record<NavItem["icon"], React.ReactNode> = {
  home: <path d="M3 11 12 4l9 7v9H3z" />,
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  scan: <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M4 12h16" />,
  bookings: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  queue: <path d="M4 6h16M4 12h16M4 18h10" />,
  summary: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  plus: <path d="M12 5v14M5 12h14" />,
  qr: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6v6H9z" /></>,
  shop: <path d="M3 9h18l-2-5H5zM5 9v11h14V9" />,
  chair: <path d="M7 3v9h10V3M5 12h14l-1 4H6zM8 16l-1 5M16 16l1 5" />,
};

export function Nav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {items.map((i) => {
        const current = path === i.href || (i.href !== "/vendor" && i.href !== "/admin" && path.startsWith(i.href + "/"));
        const icon = <svg viewBox="0 0 24 24" aria-hidden>{ICONS[i.icon]}</svg>;
        return (
          <Link key={i.href + i.label} href={i.href} className={i.fab ? "fab" : undefined} aria-current={current ? "page" : undefined}>
            {i.fab ? <span className="ic">{icon}</span> : icon}
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
