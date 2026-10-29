import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { BUSINESS_TYPES, TYPES } from "@/lib/business-types";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { setTypeEnabled } from "../actions";

export const dynamic = "force-dynamic";

/** Super admin: switch each kind of business on or off. Off types are hidden and can't sign up. */
export default async function Types({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  await requireSuperAdmin();
  const settings = await getSettings();
  const counts = await db.vendor.groupBy({ by: ["businessType"], where: { status: "APPROVED" }, _count: true });
  const shops = new Map(counts.map((c) => [c.businessType, c._count]));
  return (
    <>
      <AdminHeader current="/admin/types" />
      <main className="main">
        <h1>Business types</h1>
        <Messages searchParams={searchParams} />
        <p className="small muted">Switch a type off to hide its shops from search and stop new sign-ups. Their bookings already made still go ahead.{settings.disabledTypes.includes("GOVERNMENT") ? " Government is off until you're ready to take on offices." : ""}</p>
        <div className="list">
          {BUSINESS_TYPES.map((t) => {
            const on = !settings.disabledTypes.includes(t);
            return (
              <form key={t} action={setTypeEnabled} className="li">
                <input type="hidden" name="type" value={t} />
                <input type="hidden" name="on" value={on ? "0" : "1"} />
                <span className="grow"><b>{TYPES[t].label} <span className={`pill ${on ? "ok" : ""}`}>{on ? "On" : "Off"}</span></b><span>{TYPES[t].hint} · {shops.get(t) ?? 0} live</span></span>
                <Submit className={on ? "btn sm alt" : "btn sm"}>{on ? "Turn off" : "Turn on"}</Submit>
              </form>
            );
          })}
        </div>
      </main>
    </>
  );
}
