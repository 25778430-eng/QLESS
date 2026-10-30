import { requireSuperAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { SubHead } from "@/components/SetRow";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { MAX_PLAN_CENTS } from "@/lib/plans";
import { savePlan } from "../actions";

export const dynamic = "force-dynamic";

export default async function Plan({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  await requireSuperAdmin();
  const settings = await getSettings();
  const subscribed = await db.vendor.count({ where: { planToken: { not: null } } });
  return (
    <>
      <AdminHeader />
      <main className="main app">
        <SubHead back="/admin" backLabel="Admin" title="Monthly plan" />
        <Messages searchParams={searchParams} />
        <form action={savePlan} className="card stack">
          <div className="row between">
            <b>Vendor monthly plan</b>
            <span className={`pill ${settings.planOn ? "ok" : ""}`}>{settings.planOn ? "On" : "Off"}</span>
          </div>
          <span className="small muted">Vendors pay monthly through a PayFast subscription. Shops without a plan are hidden from customers once their free trial ends. Switching it on starts every shop&apos;s free trial from today; new shops get theirs from approval.</span>
          <div className="row">
            <label className="f grow">Price a month (R)<input className="i mono" type="number" min="1" max={MAX_PLAN_CENTS / 100} step="0.01" name="price" defaultValue={settings.planPriceCents / 100} /></label>
            <label className="f grow">Free trial (days)<input className="i mono" type="number" min="0" max="90" step="1" name="trial" defaultValue={settings.planTrialDays} /></label>
          </div>
          <label className="row small"><input type="checkbox" name="on" defaultChecked={settings.planOn} /> Require the plan</label>
          <span className="small muted">{subscribed} shops subscribed.</span>
          <Submit className="btn sm">Save</Submit>
        </form>
      </main>
    </>
  );
}
