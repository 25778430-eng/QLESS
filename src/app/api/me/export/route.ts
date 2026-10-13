import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** POPIA: lets a customer download everything Qless holds about them. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const [bookings, reviews, vendor] = await Promise.all([
    db.booking.findMany({ where: { customerId: user.id }, include: { vendor: { select: { name: true } }, service: { select: { name: true } } } }),
    db.review.findMany({ where: { customerId: user.id } }),
    db.vendor.findUnique({ where: { ownerId: user.id }, include: { services: true, staff: true, documents: { select: { kind: true, fileName: true, status: true, createdAt: true, reviewedAt: true } } } }),
  ]);
  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
      consentReminders: user.consentReminders,
      consentOffers: user.consentOffers,
      consentAt: user.consentAt,
      notifySms: user.notifySms,
      notifyWhatsapp: user.notifyWhatsapp,
    },
    bookings: bookings.map((b) => ({
      ref: b.ref, shop: b.vendor.name, service: b.service.name, status: b.status, createdAt: b.createdAt,
      priceCents: b.priceCents, depositCents: b.depositCents, feeCents: b.feeCents, depositStatus: b.depositStatus,
    })),
    reviews: reviews.map((r) => ({ rating: r.rating, text: r.text, createdAt: r.createdAt })),
    business: vendor,
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="qless-my-data.json"' },
  });
}
