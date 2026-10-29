import "server-only";
import { db } from "./db";
import { getSettings } from "./settings";
import { isAdminPhone } from "./auth";

// POPIA clean-up, run once a day from the cron tick. The privacy policy promises:
// booking and payment records kept up to 5 years, then deleted or anonymised; sign-in codes kept briefly.

export const KEEP_YEARS = 5;
const DAY = 86_400_000;
const OTP_KEEP_DAYS = 30;

export function cutoff(now: Date, years = KEEP_YEARS): Date {
  return new Date(now.getTime() - years * 365.25 * DAY);
}

/** Runs the clean-up at most once a day. Returns what it changed, or null when it already ran today. */
export async function cleanupOldData(now = new Date()) {
  const settings = await getSettings();
  if (settings.cleanupAt && now.getTime() - settings.cleanupAt.getTime() < DAY) return null;
  await db.setting.update({ where: { id: "global" }, data: { cleanupAt: now } });
  const old = cutoff(now);

  const otps = await db.otpCode.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - OTP_KEEP_DAYS * DAY) } } });
  const sessions = await db.session.deleteMany({ where: { expiresAt: { lt: now } } });

  // Old bookings keep their amounts for the books, but lose anything that points to a person.
  const bookings = await db.booking.updateMany({
    where: { createdAt: { lt: old }, OR: [{ customerId: { not: null } }, { walkInName: { not: null } }, { walkInPhone: { not: null } }, { plate: { not: null } }] },
    data: { customerId: null, walkInName: null, walkInPhone: null, plate: null, item: null, quoteNote: null },
  });
  await db.review.updateMany({ where: { createdAt: { lt: old } }, data: { text: "" } });

  // Customers with no sign-in and no booking for 5 years are deleted. Shop owners and admins are kept.
  const quiet = await db.user.findMany({
    where: {
      role: "CUSTOMER",
      createdAt: { lt: old },
      sessions: { none: { createdAt: { gte: old } } },
      bookings: { none: { createdAt: { gte: old } } },
      vendor: null,
    },
    select: { id: true, phone: true },
    take: 500,
  });
  let users = 0;
  for (const u of quiet) {
    if (isAdminPhone(u.phone)) continue;
    await db.$transaction([
      db.booking.updateMany({ where: { customerId: u.id }, data: { customerId: null } }),
      db.review.deleteMany({ where: { customerId: u.id } }),
      db.user.delete({ where: { id: u.id } }),
    ]);
    users++;
  }
  const result = { otps: otps.count, sessions: sessions.count, bookings: bookings.count, users };
  console.log("[popia] daily clean-up", result);
  return result;
}
