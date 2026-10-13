import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { registerVendor } from "../actions";

export default async function Register({ searchParams }: { searchParams: { error?: string } }) {
  const user = await requireUser();
  if (await db.vendor.findUnique({ where: { ownerId: user.id } })) redirect("/vendor");
  const rules = await getSettings();
  return (
    <main className="main">
      <div className="hello"><small>List your business on Qless</small>How do you want to start?</div>
      <Messages searchParams={searchParams} />
      <form action={registerVendor} className="stack" style={{ gap: 12 }}>
        <label className="opt">
          <input type="radio" name="level" value="VERIFIED" defaultChecked />
          <span className="grow">
            <b>Verified</b> <span className="pill ok">Recommended</span><br />
            <span className="small muted">Take deposits and get paid out. Needs any ID (SA ID, passport, asylum seeker or refugee permit){rules.requireBank ? " and a bank letter in your name" : ""}.</span>
          </span>
        </label>
        {rules.allowBasic && (
          <label className="opt">
            <input type="radio" name="level" value="BASIC" />
            <span className="grow">
              <b>Basic</b><br />
              <span className="small muted">No documents. Walk-ins and free bookings only, no deposits or payouts. Customers see &quot;Not verified&quot;. Needs a selfie and a shop photo. You can upgrade later.</span>
            </span>
          </label>
        )}

        <div className="lbl">Your business</div>
        <label className="f">Business name<input className="i" name="name" required /></label>
        <label className="f">Type of business
          <select className="i" name="category" defaultValue="Barber">
            <option>Barber</option><option>Nail technician</option><option>Hair salon</option><option>Other</option>
          </select>
        </label>
        <label className="f">Street address<input className="i" name="address" placeholder="12 Jorissen St, Braamfontein, Johannesburg" required /></label>
        <label className="f">Business cellphone<input className="i mono" name="phone" defaultValue={prettyPhone(user.phone)} /></label>

        <div className="level-verified">
          <label className="f">
            CIPC registration number {rules.requireCipc ? "" : <span className="small">(optional)</span>}
            <input className="i mono" name="cipc" placeholder="2021/483920/07" />
          </label>
          <div className="lbl">Bank account for payouts {rules.requireBank ? "" : "(optional)"}</div>
          <label className="f">Bank<input className="i" name="bankName" placeholder="FNB, Capitec, Standard Bank…" /></label>
          <label className="f">Account holder<input className="i" name="bankAccountName" placeholder="Name on the account" /></label>
          <label className="f">Account number<input className="i mono" name="bankAccountNo" inputMode="numeric" /></label>
        </div>

        <div className="fill small">Next you&apos;ll upload your documents. We check every business before it goes live, usually within 1 working day.</div>
        <Submit>Continue to documents</Submit>
      </form>
    </main>
  );
}
