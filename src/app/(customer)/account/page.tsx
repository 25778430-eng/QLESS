import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { PushToggle } from "@/components/PushToggle";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { deleteAccount, signOutAction, updateAccount } from "./actions";

export default async function Account({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const user = await requireUser();
  const vendor = await db.vendor.findUnique({ where: { ownerId: user.id } });
  return (
    <main className="main">
      <h1>Account</h1>
      <Messages searchParams={searchParams} />
      <form action={updateAccount} className="stack" style={{ gap: 12 }}>
        <label className="f">Name<input className="i" name="name" defaultValue={user.name} /></label>
        <div className="small muted">Cellphone <span className="mono">{prettyPhone(user.phone)}</span></div>
        <h3>Notifications</h3>
        <div className="card stack">
          <label className="check"><input type="checkbox" name="consentReminders" defaultChecked={user.consentReminders} /> Booking updates and reminders by SMS and WhatsApp</label>
          <label className="check"><input type="checkbox" name="notifySms" defaultChecked={user.notifySms} /> Use SMS</label>
          <label className="check"><input type="checkbox" name="notifyWhatsapp" defaultChecked={user.notifyWhatsapp} /> Use WhatsApp</label>
          <label className="check"><input type="checkbox" name="consentOffers" defaultChecked={user.consentOffers} /> Offers from shops I&apos;ve visited</label>
          <label className="check"><input type="checkbox" name="lowData" defaultChecked={user.lowData} /> Low-data mode (hides map and photos)</label>
        </div>
        <Submit>Save</Submit>
      </form>
      <h3>Appearance</h3>
      <ThemeSwitch initial={parseTheme(cookies().get(THEME_COOKIE)?.value)} />
      <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      <h3>Business</h3>
      {vendor ? (
        <Link className="btn alt" href="/vendor">Go to {vendor.name}</Link>
      ) : (
        <Link className="btn alt" href="/vendor/register">List your business on Qless</Link>
      )}
      {user.role === "ADMIN" && <Link className="btn alt" href="/admin">Admin: vendor approvals</Link>}
      <h3>Privacy</h3>
      <p className="small muted">
        We keep your details safe under POPIA and never sell them. Read our <a href="/privacy">privacy policy</a> and{" "}
        <a href="/terms">terms</a>.
      </p>
      <a className="btn alt" href="/api/me/export">Download my data</a>
      <details className="card">
        <summary>Delete my account</summary>
        <form action={deleteAccount} className="stack" style={{ marginTop: 10 }}>
          <p className="small muted">This removes your name and number. Past visits stay on the shops&apos; records without your details.</p>
          <input className="i" name="confirm" placeholder="Type DELETE" />
          <Submit className="btn warn">Delete my account</Submit>
        </form>
      </details>
      <form action={signOutAction}><Submit className="btn alt">Sign out</Submit></form>
    </main>
  );
}
