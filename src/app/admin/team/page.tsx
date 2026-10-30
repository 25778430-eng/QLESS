import Link from "next/link";
import { isAdminPhone, isSuperAdmin, requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone } from "@/lib/format";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { addAdmin, removeAdmin, setSuperAdmin } from "./actions";

export const dynamic = "force-dynamic";

type SP = { error?: string; notice?: string };

// Typed as either so this page builds on Next 14 and on Next 15, where searchParams is a promise.
export default async function Team(props: { searchParams: SP | Promise<SP> }) {
  const searchParams = await props.searchParams;
  const me = await requireSuperAdmin();
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  return (
    <>
      <AdminHeader current="/admin/team" />
      <main className="main wide">
        <h1>Team</h1>
        <Messages searchParams={searchParams} />
        <form action={addAdmin} className="card stack">
          <b>Add an admin</b>
          <span className="small muted">They need to sign in to Qless once first, so their account exists.</span>
          <input className="i mono" name="phone" inputMode="tel" placeholder="082 123 4567" required />
          <label className="row small"><input type="checkbox" name="super" /> Make them a super admin</label>
          <Submit className="btn sm">Add admin</Submit>
        </form>
        <h2>Admins</h2>
        <div className="stack" style={{ gap: 0 }}>
          {admins.map((a) => {
            const sup = isSuperAdmin(a);
            const fromEnv = isAdminPhone(a.phone);
            const self = a.id === me.id;
            return (
              <div key={a.id} className="listrow wrap">
                <span className="grow" style={{ minWidth: 180 }}>
                  <Link href={`/admin/users/${a.id}`}><b>{a.name}</b></Link>
                  {self && <span className="small muted"> (you)</span>}
                  <br />
                  <span className="small muted mono">{prettyPhone(a.phone)}</span>
                  {fromEnv && <span className="small muted"> · in ADMIN_PHONES</span>}
                </span>
                <span className="row wrap" style={{ gap: 6 }}>
                  <span className={`pill ${sup ? "sig" : ""}`}>{sup ? "Super admin" : "Admin"}</span>
                  {!self && !fromEnv && (
                    <>
                      <form action={setSuperAdmin}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="on" value={sup ? "0" : "1"} />
                        <Submit className="btn sm alt">{sup ? "Make admin" : "Make super"}</Submit>
                      </form>
                      <form action={removeAdmin}>
                        <input type="hidden" name="id" value={a.id} />
                        <Submit className="btn sm warn">Remove</Submit>
                      </form>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
