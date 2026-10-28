import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone, shortDate } from "@/lib/format";
import { AdminHeader } from "@/components/AdminHeader";

export const dynamic = "force-dynamic";

type SP = { q?: string; role?: string };
const ROLES = [
  { key: "", label: "Everyone" },
  { key: "customer", label: "Customers" },
  { key: "vendor", label: "Vendors" },
  { key: "blocked", label: "Blocked" },
];

export default async function Users(props: { searchParams: Promise<SP> }) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const q = (searchParams.q ?? "").trim();
  const role = ROLES.some((r) => r.key === searchParams.role) ? searchParams.role! : "";
  const digits = q.replace(/\D/g, "").replace(/^0/, "");

  const filters: Prisma.UserWhereInput[] = [];
  if (q) {
    filters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
        { vendor: { name: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (role === "customer") filters.push({ vendor: null, role: "CUSTOMER" });
  if (role === "vendor") filters.push({ vendor: { isNot: null } });
  if (role === "blocked") filters.push({ OR: [{ banned: true }, { blockedUntil: { gt: new Date() } }] });
  const where: Prisma.UserWhereInput = { AND: filters };
  const users = await db.user.findMany({
    where,
    include: { vendor: { select: { name: true } }, _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const ids = users.map((u) => u.id);
  const noShows = await db.booking.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, status: "NO_SHOW" }, _count: true });
  const noShowBy = new Map(noShows.map((n) => [n.customerId, n._count]));
  const now = new Date();
  const qs = (patch: Partial<SP>) => `/admin/users?${new URLSearchParams(Object.entries({ q, role, ...patch }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <>
      <AdminHeader current="/admin/users" />
      <main className="main">
        <h1>Users</h1>
        <form className="row" action="/admin/users">
          {role && <input type="hidden" name="role" value={role} />}
          <input className="i grow" name="q" defaultValue={q} placeholder="Name, cellphone or shop name" />
          <button className="btn sm">Search</button>
        </form>
        <div className="chips" role="group" aria-label="Show">
          {ROLES.map((r) => (
            <Link key={r.key} className="chip" aria-pressed={r.key === role} href={qs({ role: r.key || undefined })}>{r.label}</Link>
          ))}
        </div>
        {users.length === 0 && <p className="muted">No users found{q ? ` for "${q}"` : ""}.</p>}
        <div className="stack" style={{ gap: 0 }}>
          {users.map((u) => {
            const blocked = u.banned || (u.blockedUntil && u.blockedUntil > now);
            return (
              <Link key={u.id} className="listrow" href={`/admin/users/${u.id}`}>
                <span className="grow">
                  <b>{u.name}</b>{u.vendor && <span className="small muted"> · {u.vendor.name}</span>}
                  <br />
                  <span className="small muted">
                    <span className="mono">{prettyPhone(u.phone)}</span> · {u._count.bookings} bookings · {noShowBy.get(u.id) ?? 0} no-shows · joined {shortDate(u.createdAt)}
                  </span>
                </span>
                {blocked ? <span className="pill bad">Blocked</span> : u.role === "ADMIN" ? <span className="pill">Admin</span> : u.vendor ? <span className="pill">Vendor</span> : null}
              </Link>
            );
          })}
        </div>
        {users.length === 50 && <p className="small muted">Showing the newest 50. Search to narrow it down.</p>}
      </main>
    </>
  );
}
