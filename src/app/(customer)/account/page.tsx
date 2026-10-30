import { cookies } from "next/headers";
import { requireUser, staffFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { ProfileHead, SetGroup, SetRow, Icon } from "@/components/SetRow";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { LANGS } from "@/lib/i18n";
import { langFor } from "@/lib/lang";
import { inClientMode } from "@/lib/mode";
import { signOutAction, switchMode } from "./actions";

export const dynamic = "force-dynamic";

export default async function Account({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const user = await requireUser();
  const [vendor, staff] = await Promise.all([db.vendor.findUnique({ where: { ownerId: user.id } }), staffFor(user)]);
  const isStaff = staff.length > 0;
  const clientMode = inClientMode();
  const role = vendor ? "Shop owner" : isStaff ? (clientMode ? "Client" : "Staff") : user.role === "ADMIN" ? "Admin" : "Customer";
  const lang = langFor(user);

  return (
    <main className="main app">
      <ProfileHead
        letter={(user.name.trim()[0] ?? "Q").toUpperCase()}
        name={user.name}
        lines={[prettyPhone(user.phone), user.email ?? "No email yet"]}
        pills={<><span className="pill">{role}</span><span className="pill ok">Active</span></>}
      />
      <Messages searchParams={searchParams} />

      {(vendor || isStaff || user.role === "ADMIN") && (
        <SetGroup title="Work">
          {vendor && <SetRow icon="shop" title={vendor.name} sub="Your shop" href="/vendor/account" />}
          {isStaff && (
            <form action={switchMode}>
              <input type="hidden" name="mode" value={clientMode ? "staff" : "client"} />
              <button className="setrow">
                <span className="ico"><Icon name="switch" /></span>
                <span className="grow"><b>{clientMode ? "Switch to staff mode" : "Switch to client mode"}</b><span>{clientMode ? `My bay at ${staff[0].vendor.name}` : "Find and book other places"}</span></span>
                <span className="chev" aria-hidden>›</span>
              </button>
            </form>
          )}
          {user.role === "ADMIN" && <SetRow icon="admin" title="Admin" sub="Approvals and settings" href="/admin" />}
        </SetGroup>
      )}
      {!vendor && !isStaff && (
        <SetGroup title="Business">
          <SetRow icon="plus" title="List your business" sub="Let customers join your queue" href="/vendor/register" />
        </SetGroup>
      )}

      <SetGroup title="Settings">
        <SetRow icon="person" title="Profile" sub="Name, email and cellphone" href="/account/profile" />
        <SetRow icon="bell" title="Notifications" sub="SMS, WhatsApp and data saver" href="/account/notifications" />
        <SetRow icon="globe" title="Language" sub={LANGS[lang]} href="/account/language" />
      </SetGroup>

      <SetGroup title="Look">
        <div className="setpad"><ThemeSwitch initial={parseTheme(cookies().get(THEME_COOKIE)?.value)} /></div>
      </SetGroup>

      <SetGroup title="More">
        <SetRow icon="help" title="Help" href="/help" external />
        <SetRow icon="lock" title="Privacy policy" href="/privacy" external />
        <SetRow icon="shield" title="POPIA and PAIA" href="/paia" external />
        <SetRow icon="download" title="Download my data" href="/api/me/export" external />
        <SetRow icon="doc" title="Terms of use" href="/terms" external />
      </SetGroup>

      <form action={signOutAction}><Submit className="btn alt">Sign out</Submit></form>
    </main>
  );
}
