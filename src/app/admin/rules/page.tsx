import { requireSuperAdmin } from "@/lib/auth";
import { AdminHeader } from "@/components/AdminHeader";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { SubHead } from "@/components/SetRow";
import { getSettings } from "@/lib/settings";
import { saveSignupRules } from "../actions";

export const dynamic = "force-dynamic";

export default async function Rules({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  await requireSuperAdmin();
  const settings = await getSettings();
  return (
    <>
      <AdminHeader />
      <main className="main app">
        <SubHead back="/admin" backLabel="Admin" title="Sign-up rules" />
        <Messages searchParams={searchParams} />
        <form action={saveSignupRules} className="card stack">
          <b>Vendor sign-up rules</b>
          <span className="small muted">Changes apply to new sign-ups and upgrades. Approved shops keep their status.</span>
          <label className="check"><input type="checkbox" name="requireCipc" defaultChecked={settings.requireCipc} /> <span><b>Require CIPC registration</b><br />Number and certificate. Switch off to let unregistered businesses become Verified.</span></label>
          <label className="check"><input type="checkbox" name="requireAddress" defaultChecked={settings.requireAddress} /> <span><b>Require proof of business address</b></span></label>
          <label className="check"><input type="checkbox" name="requireBank" defaultChecked={settings.requireBank} /> <span><b>Require bank details and letter</b></span></label>
          <label className="check"><input type="checkbox" name="allowBasic" defaultChecked={settings.allowBasic} /> <span><b>Allow Basic listings</b><br />No documents, no deposits or payouts, shown as &quot;Not verified&quot;.</span></label>
          <span className="small muted">An owner ID (SA ID, passport, asylum seeker or refugee permit) is always required for Verified.</span>
          <Submit className="btn sm">Save rules</Submit>
        </form>
      </main>
    </>
  );
}
