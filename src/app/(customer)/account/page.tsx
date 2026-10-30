import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser, staffFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { ThemeButton } from "@/components/ThemeButton";
import { Icon, SetRow } from "@/components/SetRow";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { LANGS } from "@/lib/i18n";
import { langFor } from "@/lib/lang";
import { inClientMode } from "@/lib/mode";
import { flipSetting, signOutAction, switchMode } from "./actions";

export const dynamic = "force-dynamic";

const TABS = [["me", "Me"], ["work", "Work"], ["privacy", "Privacy"]] as const;
type Tab = (typeof TABS)[number][0];

/** A row with a switch that saves as soon as it's tapped. */
function SwitchRow({ k, title, sub, on }: { k: string; title: string; sub?: string; on: boolean }) {
  return (
    <form action={flipSetting}>
      <input type="hidden" name="key" value={k} />
      <button className="setrow" aria-pressed={on}>
        <span className="grow"><b>{title}</b>{sub && <span>{sub}</span>}</span>
        <span className={`sw ${on ? "on" : ""}`} aria-hidden />
      </button>
    </form>
  );
}

export default async function Account({ searchParams }: { searchParams: { error?: string; notice?: string; tab?: string } }) {
  const user = await requireUser();
  const [vendor, staff] = await Promise.all([db.vendor.findUnique({ where: { ownerId: user.id } }), staffFor(user)]);
  const isStaff = staff.length > 0;
  const clientMode = inClientMode();
  const role = vendor ? "Shop owner" : isStaff ? (clientMode ? "Client" : "Staff") : user.role === "ADMIN" ? "Admin" : "Customer";
  const tab: Tab = TABS.some(([t]) => t === searchParams.tab) ? (searchParams.tab as Tab) : "me";

  return (
    <main className="main app">
      <div className="idbar">
        <span className="sq">{(user.name.trim()[0] ?? "Q").toUpperCase()}</span>
        <div className="grow" style={{ minWidth: 0 }}>
          <b className="ell">{user.name}</b>
          <span className="ell">{prettyPhone(user.phone)} · {role}</span>
        </div>
        <ThemeButton initial={parseTheme(cookies().get(THEME_COOKIE)?.value)} />
      </div>
      <nav className="seg" aria-label="Account sections">
        {TABS.map(([t, label]) => <Link key={t} href={`/account?tab=${t}`} aria-current={tab === t ? "page" : undefined}>{label}</Link>)}
      </nav>
      <Messages searchParams={searchParams} />

      {tab === "me" && (
        <>
          <div className="block">
            <SetRow icon="person" title="Name" sub={user.name} href="/account/profile" />
            <SetRow icon="doc" title="Email" sub={user.email ?? "Add your email"} href="/account/profile" />
            <SetRow icon="globe" title="Language" sub={LANGS[langFor(user)]} href="/account/language" />
          </div>
          <div className="setgroup"><h4>Tell me by</h4></div>
          <div className="block">
            <SwitchRow k="consentReminders" title="Booking reminders" sub="1 hour and 20 min before" on={user.consentReminders} />
            <SwitchRow k="notifySms" title="SMS" on={user.notifySms} />
            <SwitchRow k="notifyWhatsapp" title="WhatsApp" on={user.notifyWhatsapp} />
            <SwitchRow k="consentOffers" title="Offers from places I've visited" on={user.consentOffers} />
            <SwitchRow k="lowData" title="Data saver" sub="No shop photos" on={user.lowData} />
          </div>
        </>
      )}

      {tab === "work" && (
        <div className="block">
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
          {!vendor && !isStaff && <SetRow icon="plus" title="List your business" sub="Let customers join your queue" href="/vendor/register" />}
        </div>
      )}

      {tab === "privacy" && (
        <div className="block">
          <SetRow icon="help" title="Help" href="/help" external />
          <SetRow icon="lock" title="Privacy policy" href="/privacy" external />
          <SetRow icon="shield" title="POPIA and PAIA" href="/paia" external />
          <SetRow icon="download" title="Download my data" href="/api/me/export" external />
          <SetRow icon="doc" title="Terms of use" href="/terms" external />
          <SetRow icon="out" title="Delete my account" href="/account/profile#delete" />
        </div>
      )}

      <form action={signOutAction}><Submit className="btn alt">Sign out</Submit></form>
    </main>
  );
}
