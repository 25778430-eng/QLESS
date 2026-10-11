import { requireVendor } from "@/lib/auth";
import { rand, shortDate } from "@/lib/format";
import { appUrl } from "@/lib/http";
import { payfastConfigured, subscriptionForm } from "@/lib/payfast";
import { planState } from "@/lib/plans";
import { getSettings } from "@/lib/settings";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { cancelPlanAction, testSubscribeAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function Plan({ searchParams }: { searchParams: { error?: string; notice?: string; paid?: string } }) {
  const { user, vendor } = await requireVendor();
  const settings = await getSettings();
  const state = planState(vendor, settings);
  const price = rand(settings.planPriceCents);
  const canSubscribe = !vendor.planToken && (state.kind === "TRIAL" || state.kind === "EXPIRED" || state.kind === "ACTIVE");
  const form = canSubscribe && payfastConfigured()
    ? subscriptionForm({ vendorId: vendor.id, amountCents: settings.planPriceCents, itemName: `Qless monthly plan: ${vendor.name}`, phone: user.phone, appUrl: appUrl() })
    : null;

  return (
    <main className="main">
      <h2>Monthly plan</h2>
      <Messages searchParams={searchParams} />
      {searchParams.paid && state.kind !== "ACTIVE" && <div className="fill small">Waiting for PayFast to confirm your payment…</div>}
      <div className="card stack">
        {state.kind === "OFF" && <span>Qless is free for vendors right now. There&apos;s nothing to pay.</span>}
        {state.kind === "WAIVED" && <span>Qless has waived the monthly plan for {vendor.name}. There&apos;s nothing to pay.</span>}
        {state.kind === "TRIAL" && (
          <>
            <span className="pill" style={{ alignSelf: "flex-start" }}>Free trial</span>
            <span>Your free trial ends on <b>{shortDate(state.until)}</b>. Subscribe for {price} a month to stay listed after that.</span>
          </>
        )}
        {state.kind === "ACTIVE" && (
          <>
            <span className="pill ok" style={{ alignSelf: "flex-start" }}>Active</span>
            <span>
              Your plan is paid up to <b>{shortDate(state.until)}</b>.
              {vendor.planToken ? ` PayFast charges ${rand(vendor.planAmountCents ?? settings.planPriceCents)} each month.` : " It won't renew unless you subscribe again."}
            </span>
          </>
        )}
        {state.kind === "EXPIRED" && (
          <>
            <span className="pill bad" style={{ alignSelf: "flex-start" }}>Not listed</span>
            <span>Your {vendor.planPaidUntil ? "plan" : "free trial"} ended on {shortDate(state.since)}. Customers can&apos;t find or book you until you subscribe for {price} a month.</span>
          </>
        )}
      </div>
      {canSubscribe &&
        (form ? (
          <form action={form.action} method="post" className="stack">
            {form.fields.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <button className="btn">Subscribe for {price} a month</button>
            <p className="small muted center">Card or debit order via PayFast. Cancel any time.</p>
          </form>
        ) : process.env.NODE_ENV !== "production" ? (
          <form action={testSubscribeAction} className="stack">
            <div className="banner">PayFast keys aren&apos;t set yet, so this is a test payment. No money moves.</div>
            <Submit>Approve test payment of {price}</Submit>
          </form>
        ) : (
          <div className="error">Payments aren&apos;t set up yet. Please try again later.</div>
        ))}
      {vendor.planToken && (
        <form action={cancelPlanAction}>
          <Submit className="btn alt">Cancel monthly plan</Submit>
        </form>
      )}
    </main>
  );
}
