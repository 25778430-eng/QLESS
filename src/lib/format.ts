export const TZ = "Africa/Johannesburg";

/** Today's date in South Africa as YYYY-MM-DD. */
export function sastDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Day of week in South Africa, Monday = 0. */
export function sastWeekday(d = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(d);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(name);
}

/** Current time in South Africa as HH:MM. */
export function sastClock(d = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/** A clock time ("13:30") on today's date in South Africa (UTC+2, no daylight saving). */
export function sastAt(hhmm: string, d = new Date()): Date {
  return new Date(`${sastDate(d)}T${hhmm}:00+02:00`);
}

export function time(d: Date | null | undefined): string {
  return d ? sastClock(d) : "";
}

export function longDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(d);
}

export function shortDate(d: Date): string {
  return new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, day: "numeric", month: "short" }).format(d);
}

export function rand(cents: number): string {
  const r = cents / 100;
  return "R" + (Number.isInteger(r) ? r.toLocaleString("en-ZA").replace(/\s/g, ",") : r.toFixed(2));
}

/** Normalises a South African cellphone number to E.164 (+27...). Returns null if invalid. */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let n = digits;
  if (n.startsWith("+27")) n = n.slice(3);
  else if (n.startsWith("27") && n.length === 11) n = n.slice(2);
  else if (n.startsWith("0")) n = n.slice(1);
  if (!/^[6-8]\d{8}$/.test(n)) return null;
  return "+27" + n;
}

export function prettyPhone(e164: string): string {
  const n = e164.replace("+27", "");
  return `+27 ${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

/** CIPC registration numbers look like 2021/483920/07. */
export function validCipc(input: string): boolean {
  return /^(19|20)\d{2}\/\d{6}\/\d{2}$/.test(input.trim());
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function distance(km: number): string {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
