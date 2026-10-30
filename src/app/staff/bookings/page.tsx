import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { shortDate, time } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = { PENDING_PAYMENT: "Paying", WAITING: "Waiting", CALLED: "Called", IN_SERVICE: "In my bay" };

/** Everyone booked with this staff member (or with "anyone") who hasn't been served yet, today and on later days. */
export default async function StaffBookings() {
  const { staff, vendor } = await requireStaff();
  const rows = await db.booking.findMany({
    where: { vendorId: vendor.id, OR: [{ staffId: staff.id }, { staffId: null }], status: { in: ["PENDING_PAYMENT", "WAITING", "CALLED", "IN_SERVICE"] } },
    include: { customer: { select: { name: true } }, service: { select: { name: true } }, queueDay: { select: { date: true } } },
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: 100,
  });
  const when = (b: (typeof rows)[number]) => b.scheduledAt ?? new Date(`${b.queueDay.date}T12:00:00+02:00`);
  return (
    <main className="main app">
      <div className="hello"><small>{vendor.name}</small>Bookings</div>
      {rows.length === 0 && <p className="muted">No bookings for you yet.</p>}
      <div className="setlist">
        {rows.map((b) => (
          <div key={b.id} className="setrow">
            <span className="ico mono" style={{ fontSize: 12, fontWeight: 700 }}>{b.ticketNo ?? "–"}</span>
            <span className="grow">
              <b>{b.customer?.name ?? b.walkInName ?? "Walk-in"}</b>
              <span>{b.service.name} · {shortDate(when(b))}{b.scheduledAt ? ` at ${time(b.scheduledAt)}` : ""} · {b.staffId ? "with me" : "anyone"}</span>
            </span>
            <span className="pill">{STATUS[b.status]}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
