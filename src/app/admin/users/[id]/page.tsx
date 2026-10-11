import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { depositLine } from "@/lib/bookings";
import { prettyPhone, rand, shortDate, time } from "@/lib/format";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { banUser, liftNoShowBlock, unbanUser } from "../../actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  PENDING_PAYMENT: "Not paid",
  WAITING: "Waiting",
  CALLED: "Called",
  IN_SERVICE: "Being served",
  DONE: "Done",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};

export default async function UserDetail({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; notice?: string } }) {
  const admin = await requireAdmin();
  const u = await db.user.findUnique({
    where: { id: params.id },
    include: {
      vendor: { select: { name: true, slug: true, status: true } },
      bookings: { orderBy: { createdAt: "desc" }, take: 50, include: { vendor: { select: { name: true } }, service: { select: { name: true } } } },
    },
  });
  if (!u) notFound();
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 86_400_000);
  const [total, noShows, noShows30] = await Promise.all([
    db.booking.count({ where: { customerId: u.id } }),
    db.booking.count({ where: { customerId: u.id, status: "NO_SHOW" } }),
    db.booking.count({ where: { customerId: u.id, status: "NO_SHOW", createdAt: { gte: since } } }),
  ]);
  const autoBlocked = !!u.blockedUntil && u.blockedUntil > now;
  const self = u.id === admin.id;

  return (
    <>
      <AdminHeader current="/admin/users" />
      <main className="main">
        <Link className="small" href="/admin/users">← All users</Link>
        <h2>{u.name}</h2>
        <Messages searchParams={searchParams} />
        <div className="card stack">
          <span className="mono">{prettyPhone(u.phone)}</span>
          <span className="small muted">Joined {shortDate(u.createdAt)} · {u.role === "ADMIN" ? "Admin" : u.vendor ? "Vendor" : "Customer"}</span>
          {u.vendor && <span className="small">Shop: <Link href={`/v/${u.vendor.slug}`}>{u.vendor.name}</Link> ({u.vendor.status.toLowerCase()})</span>}
          <div className="stat">
            <div><b>{total}</b><span>bookings</span></div>
            <div><b>{noShows}</b><span>no-shows</span></div>
            <div><b>{noShows30}</b><span>no-shows, 30 days</span></div>
          </div>
        </div>

        {u.banned ? (
          <form action={unbanUser} className="card stack">
            <input type="hidden" name="id" value={u.id} />
            <span className="pill bad" style={{ alignSelf: "flex-start" }}>Blocked by admin</span>
            {u.bannedReason && <span className="small">Reason: {u.bannedReason}</span>}
            <span className="small muted">They can&apos;t sign in{u.vendor ? " and their shop is hidden" : ""}.</span>
            <Submit className="btn sm">Unblock</Submit>
          </form>
        ) : self || u.role === "ADMIN" ? (
          <p className="small muted">Admins can&apos;t be blocked here. Remove their number from ADMIN_PHONES first.</p>
        ) : (
          <form action={banUser} className="card stack">
            <input type="hidden" name="id" value={u.id} />
            <b>Block this user</b>
            <span className="small muted">They&apos;re signed out and can&apos;t sign in or book{u.vendor ? ", and their shop is hidden from customers" : ""}. Bookings already made stay as they are.</span>
            <input className="i" name="reason" placeholder="Reason (only admins see this)" />
            <Submit className="btn sm warn">Block</Submit>
          </form>
        )}

        {autoBlocked && (
          <form action={liftNoShowBlock} className="card row between">
            <input type="hidden" name="id" value={u.id} />
            <span className="small">Booking paused for no-shows until {shortDate(u.blockedUntil!)}.</span>
            <Submit className="btn sm alt">Lift</Submit>
          </form>
        )}

        <h3>Bookings</h3>
        {u.bookings.length === 0 && <p className="small muted">No bookings yet.</p>}
        <div className="stack" style={{ gap: 0 }}>
          {u.bookings.map((b) => (
            <div key={b.id} className="listrow">
              <span className="grow">
                <b>{b.vendor.name}</b> · {b.service.name}
                <br />
                <span className="small muted">
                  {shortDate(b.createdAt)} {time(b.createdAt)} · <span className="mono">{b.ref}</span> · {rand(b.priceCents)}
                  {b.depositCents > 0 ? ` · ${depositLine(b)}` : ""}
                  {b.feeCents > 0 ? ` · fee ${rand(b.feeCents)}` : ""}
                </span>
              </span>
              <span className={`pill ${b.status === "NO_SHOW" ? "bad" : b.status === "DONE" ? "ok" : ""}`}>{STATUS[b.status]}</span>
            </div>
          ))}
        </div>
        {total > 50 && <p className="small muted">Showing the newest 50 of {total}.</p>}
      </main>
    </>
  );
}
