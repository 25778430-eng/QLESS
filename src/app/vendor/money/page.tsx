import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { SetGroup, SetRow, SubHead } from "@/components/SetRow";
import { saveBank, saveDeposit } from "../actions";

export const dynamic = "force-dynamic";

/** Where the shop gets paid: bank account and deposit rules. Only Verified shops handle money through Qless. */
export default async function Money({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { vendor } = await requireVendor();
  if (vendor.level !== "VERIFIED") {
    return (
      <main className="main app">
        <SubHead back="/vendor/account" backLabel="Account" title="Money" />
        <div className="card stack">
          <b>Get paid through Qless</b>
          <span className="small muted">Verified shops take deposits from customers, which cuts no-shows, and Qless pays the money into their bank account. Basic shops are paid by customers in the shop.</span>
          <Link className="btn" href="/vendor/documents?level=VERIFIED">Become Verified</Link>
        </div>
      </main>
    );
  }
  return (
    <main className="main app">
      <SubHead back="/vendor/account" backLabel="Account" title="Money" />
      <Messages searchParams={searchParams} />
      <h3>Bank account</h3>
      <form action={saveBank} className="stack" style={{ gap: 12 }}>
        <label className="f">Bank<input className="i" name="bankName" defaultValue={vendor.bankName ?? ""} placeholder="e.g. Capitec" /></label>
        <label className="f">Account holder<input className="i" name="bankAccountName" defaultValue={vendor.bankAccountName ?? ""} /></label>
        <label className="f">Account number<input className="i mono" name="bankAccountNo" inputMode="numeric" defaultValue={vendor.bankAccountNo ?? ""} /></label>
        <Submit>Save bank account</Submit>
      </form>
      <h3>Deposit</h3>
      <form action={saveDeposit} className="stack" style={{ gap: 12 }}>
        <div className="row">
          <label className="f grow">Deposit (R)<input className="i mono" type="number" min="0" max="1000" step="1" name="deposit" defaultValue={vendor.depositCents / 100} /></label>
          <label className="f grow">Refund if cancelled (hours before)<input className="i mono" type="number" min="0" max="48" step="0.5" name="refundHours" defaultValue={vendor.refundWindowMins / 60} /></label>
        </div>
        <Submit className="btn alt">Save deposit</Submit>
      </form>
      <SetGroup>
        <SetRow icon="card" title="Payouts" sub="Deposits earned, paid out and still due" href="/vendor/payouts" />
      </SetGroup>
    </main>
  );
}
