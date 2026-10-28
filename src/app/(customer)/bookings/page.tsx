import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACTIVE_STATUSES } from "@/lib/bookings";
import { initials, rand, shortDate } from "@/lib/format";
import { Messages } from "@/components/Messages";

export const dynamic = "force-dynamic";

const PAST_LABEL: Record<string, { text: string; kind: string }> = {
  DONE: { text: "Done", kind: "ok" },
  NO_SHOW: { text: "Missed", kind: "bad" },
  CANCELLED: { text: "Cancelled", kind: "" },
};

export default async function MyBookings(props: { searchParams: Promise<{ error?: string; notice?: string }> }) {
  const searchParams = await props.searchParams;
  const user = await requireUser();
  const bookings = await db.booking.findMany({
    where: { customerId: user.id },
    include: { vendor: true, service: true, staff: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const upcoming = bookings.filter((b) => (ACTIVE_STATUSES as readonly string[]).includes(b.status));
  const past = bookings.filter((b) => !(ACTIVE_STATUSES as readonly string[]).includes(b.status));
  return (
    <main className="main">
      <h1>My bookings</h1>
      <Messages searchParams={searchParams} />
      <h3>Upcoming</h3>
      {upcoming.length === 0 && <p className="muted">Nothing booked. <Link href="/discover">Find a shop</Link>.</p>}
      {upcoming.map((b) => (
        <Link key={b.id} href={`/bookings/${b.id}`} className="listrow card" style={{ padding: 12 }}>
          <span className="avatar">{initials(b.vendor.name)}</span>
          <span className="grow"><b>{b.vendor.name}</b><br /><span className="small muted">{b.service.name}{b.staff ? ` with ${b.staff.name}` : ""}</span></span>
          {b.status === "PENDING_PAYMENT" ? <span className="pill sig">Pay deposit</span> : b.status === "CALLED" ? <span className="pill sig">Your turn</span> : <span className="pill ok">In queue</span>}
        </Link>
      ))}
      <h3>Past visits</h3>
      {past.length === 0 && <p className="muted">No past visits yet.</p>}
      <div className="stack" style={{ gap: 0 }}>
        {past.map((b) => (
          <div key={b.id} className="listrow">
            <span className="avatar">{initials(b.vendor.name)}</span>
            <Link href={`/bookings/${b.id}`} className="grow" style={{ textDecoration: "none" }}>
              <b>{b.vendor.name}</b><br />
              <span className="small muted">{shortDate(b.createdAt)} · {b.service.name}{b.staff ? ` with ${b.staff.name}` : ""} · {rand(b.priceCents)}</span>
            </Link>
            {b.status === "DONE" ? (
              <Link className="btn sm" href={`/v/${b.vendor.slug}`}>Book again</Link>
            ) : (
              <span className={`pill ${PAST_LABEL[b.status]?.kind ?? ""}`}>{PAST_LABEL[b.status]?.text ?? b.status}</span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
