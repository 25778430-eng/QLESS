// Tab bar items. Kept out of the client Nav component so server layouts can translate them.

export type NavItem = {
  href: string;
  label: string;
  icon: "home" | "map" | "scan" | "bookings" | "person" | "queue" | "summary" | "plus" | "qr" | "shop" | "chair";
  fab?: boolean;
};

export const CUSTOMER_NAV: NavItem[] = [
  { href: "/discover", label: "Home", icon: "home" },
  { href: "/bookings", label: "Bookings", icon: "bookings" },
  { href: "/account", label: "Account", icon: "person" },
];

export const VENDOR_NAV: NavItem[] = [
  { href: "/vendor", label: "Queue", icon: "queue" },
  { href: "/vendor/walk-in", label: "Walk-in", icon: "plus", fab: true },
  { href: "/vendor/account", label: "Account", icon: "shop" },
];

export const STAFF_NAV: NavItem[] = [
  { href: "/staff", label: "My bay", icon: "chair" },
  { href: "/staff/bookings", label: "Bookings", icon: "bookings" },
  { href: "/account", label: "Account", icon: "person" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Home", icon: "summary" },
  { href: "/admin/approvals", label: "Approvals", icon: "bookings" },
  { href: "/admin/users", label: "Users", icon: "queue" },
  { href: "/account", label: "Account", icon: "person" },
];
