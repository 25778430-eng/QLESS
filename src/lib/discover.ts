import "server-only";
import { db } from "./db";
import { haversineKm, sastDate } from "./format";
import { getSettings } from "./settings";
import { featuredOrder, isFeatured, planAllowsListing, planState } from "./plans";
import { newShopCode, normaliseShopCode } from "./shop-code";
import { TYPES, enabledTypes, isBusinessType } from "./business-types";
import type { Vendor } from "@prisma/client";

/** Chips on Home and the map: "All" plus each business type the super admin hasn't switched off. */
export function typeChips(disabled: string[]): Array<{ key: string; label: string }> {
  return [{ key: "All", label: "All" }, ...enabledTypes(disabled).map((t) => ({ key: t, label: TYPES[t].short }))];
}

export type ShopQuery = { q: string; cat: string; here: { lat: number; lng: number } | null };

export function parseShopQuery(sp: { q?: string; cat?: string; lat?: string; lng?: string }): ShopQuery {
  return {
    q: (sp.q ?? "").trim(),
    cat: isBusinessType(sp.cat ?? "") ? sp.cat! : "All",
    here: sp.lat && sp.lng && Number.isFinite(Number(sp.lat)) && Number.isFinite(Number(sp.lng)) ? { lat: Number(sp.lat), lng: Number(sp.lng) } : null,
  };
}

/** Listed shops with today's queue state, nearest and featured first. */
export async function findShops({ q, cat, here }: ShopQuery) {
  const settings = await getSettings();
  const now = new Date();
  const found = await db.vendor.findMany({
    where: {
      status: "APPROVED",
      owner: { banned: false },
      businessType: { notIn: settings.disabledTypes },
      ...(cat !== "All" ? { businessType: { equals: cat, notIn: settings.disabledTypes } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { address: { contains: q, mode: "insensitive" } }, { services: { some: { name: { contains: q, mode: "insensitive" } } } }] } : {}),
    },
    include: {
      queueDays: { where: { date: sastDate() } },
      reviews: { select: { rating: true } },
    },
    orderBy: [{ featured: "desc" }, { featuredRank: "desc" }],
    take: 100,
  });
  // Shops whose free trial ended without a plan are hidden.
  const vendors = found.filter((v) => planAllowsListing(planState(v, settings, now)));
  const dayIds = vendors.flatMap((v) => v.queueDays.map((d) => d.id));
  const counts = await db.booking.groupBy({ by: ["queueDayId"], where: { queueDayId: { in: dayIds }, status: { in: ["WAITING", "CALLED"] } }, _count: true });
  const used = await db.booking.groupBy({ by: ["queueDayId"], where: { queueDayId: { in: dayIds }, status: { not: "CANCELLED" } }, _count: true });
  const waitingBy = new Map(counts.map((c) => [c.queueDayId, c._count]));
  const usedBy = new Map(used.map((c) => [c.queueDayId, c._count]));

  return vendors
    .map((v) => {
      const day = v.queueDays[0];
      const km = here && v.lat != null && v.lng != null ? haversineKm(here, { lat: v.lat, lng: v.lng }) : null;
      const rating = v.reviews.length ? v.reviews.reduce((s, r) => s + r.rating, 0) / v.reviews.length : 0;
      let state: { label: string; kind: "" | "bad"; waiting: number } = { label: "Closed now", kind: "bad", waiting: 0 };
      if (day && day.status !== "CLOSED") {
        const waiting = waitingBy.get(day.id) ?? 0;
        state = (usedBy.get(day.id) ?? 0) >= day.capacity ? { label: "Full today", kind: "bad", waiting } : { label: `${waiting} waiting`, kind: "", waiting };
      }
      return { v, km, rating, count: v.reviews.length, state, featured: isFeatured(v, now) };
    })
    .sort((a, b) => featuredOrder(a.v, b.v, now) || (a.km ?? 1e9) - (b.km ?? 1e9) || b.rating - a.rating);
}

export type ShopRow = Awaited<ReturnType<typeof findShops>>[number];

export function mapPins(rows: ShopRow[]) {
  return rows
    .filter((r) => r.v.lat != null && r.v.lng != null)
    .map((r) => ({ lat: r.v.lat!, lng: r.v.lng!, label: `${r.v.name} · ${r.state.label}`, href: `/v/${r.v.slug}`, busy: r.state.kind === "bad", featured: r.featured }));
}

/** The shop's poster code, made on first use for shops created before codes existed. */
export async function ensureShopCode(vendor: Pick<Vendor, "id" | "code">): Promise<string> {
  if (vendor.code) return vendor.code;
  for (;;) {
    const code = newShopCode();
    if (await db.vendor.findUnique({ where: { code } })) continue;
    await db.vendor.update({ where: { id: vendor.id }, data: { code } });
    return code;
  }
}

/** Finds a listed shop by the code a customer typed. */
export async function shopByCode(input: string) {
  const code = normaliseShopCode(input);
  if (!code) return null;
  const settings = await getSettings();
  return db.vendor.findFirst({ where: { code, status: "APPROVED", businessType: { notIn: settings.disabledTypes } }, select: { slug: true } });
}
