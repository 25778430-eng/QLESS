import { requireSuperAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { SubHead } from "@/components/SetRow";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { savePayInApp } from "../actions";

export const dynamic = "force-dynamic";

export default async function PayInApp({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  await requireSuperAdmin();
  const settings = await getSettings();
  const [shops, paid] = await Promise.all([
    db.vendor.count({ where: { payInApp: true, level: "VERIFIED", status: "APPROVED" } }),
    db.booking.aggregate({ where: { restPaidCents: { gt: 0 } }, _sum: { restPaidCents: true }, _count: true }),
  ]);
  return (
    <>
      <AdminHeader />
      <main className="main app">
        <SubHead back="/admin" backLabel="Admin" title="Pay the rest in the app" />
        <Messages searchParams={searchParams} />
        <form action={savePayInApp} className="card stack">
          <div className="row between">
            <b>Clients can pay the rest in the app</b>
            <span className={`pill ${settings.payInAppOn ? "ok" : ""}`}>{settings.payInAppOn ? "On" : "Off"}</span>
          </div>
          <label className="check"><input type="checkbox" name="on" defaultChecked={settings.payInAppOn} /> On for Verified shops that switch it on</label>
          <span className="small muted">{shops} shops switched on · {rand(paid._sum.restPaidCents ?? 0)} paid in the app ({paid._count} payments)</span>
          <Submit>Save</Submit>
        </form>
      </main>
    </>
  );
}
