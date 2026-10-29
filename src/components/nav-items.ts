// Tab bar items. Kept out of the client Nav component so server layouts can translate them.

export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "map" | "scan" | "bookings" | "person" | "queue" | "summary" | "plus" | "qr" | "shop" | "chair";
  fab?: boolean;
};

export const CUSTOMER_NAV: NavItem[] = [
  { href: "/discover", label: "Home", icon: "home" },
  { href: "/map", label: "Map", icon: "map" },
  { href: "/scan", label: "Scan", icon: "scan", fab: true },
  { href: "/bookings", label: "Bookings", icon: "bookings" },
  { href: "/account", label: "Account", icon: "person" },
];

export const VENDOR_NAV: NavItem[] = [
  { href: "/vendor", label: "Queue", icon: "queue" },
  { href: "/vendor/summary", label: "Summary", icon: "summary" },
  { href: "/vendor/walk-in", label: "Walk-in", icon: "plus", fab: true },
  { href: "/vendor/qr", label: "QR", icon: "qr" },
  { href: "/vendor/account", label: "Account", icon: "shop" },
];

export const STAFF_NAV: NavItem[] = [
  { href: "/staff", label: "My chair", icon: "chair" },
  { href: "/discover", label: "Home", icon: "home" },
  { href: "/staff/walk-in", label: "Walk-in", icon: "plus", fab: true },
  { href: "/bookings", label: "Bookings", icon: "bookings" },
  { href: "/account", label: "Account", icon: "person" },
];
