import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser, staffFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { initials, prettyPhone } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { PushToggle } from "@/components/PushToggle";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import { deleteAccount, signOutAction, updateAccount } from "./actions";
import { LanguagePicker } from "@/components/LanguagePicker";
import { langFor } from "@/lib/lang";

export default async function Account({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const user = await requireUser();
  const vendor = await db.vendor.findUnique({ where: { ownerId: user.id } });
  const staff = await staffFor(user);
  return (
    <main className="main">
      <div className="prof">
        <span className="avatar">{initials(user.name)}</span>
        <div className="stack" style={{ gap: 2 }}>
          <h2>{user.name}</h2>
          {user.email && <span className="small muted">{user.email}</span>}
          <span className="small muted mono">{prettyPhone(user.phone)}</span>
        </div>
      </div>
      <Messages searchParams={searchParams} />
      {!user.email && <div className="banner">Add your email so we can send receipts and help you get back into your account.</div>}

      {(vendor || staff.length > 0 || user.role === "ADMIN") && (
        <>
          <div className="lbl">Work</div>
          <div className="list">
            {vendor && <Link className="li" href="/vendor/account"><span className="grow"><b>{vendor.name}</b><span>Your business hub</span></span><span className="chev">›</span></Link>}
            {staff.map((s) => <Link key={s.id} className="li" href="/staff"><span className="grow"><b>My chair at {s.vendor.name}</b><span>Call your next client</span></span><span className="chev">›</span></Link>)}
            {user.role === "ADMIN" && <Link className="li" href="/admin"><span className="grow"><b>Admin</b><span>Vendor approvals and settings</span></span><span className="chev">›</span></Link>}
          </div>
        </>
      )}

      <form action={updateAccount} className="stack" style={{ gap: 12 }}>
        <div className="lbl">Personal details</div>
        <label className="f">Full name<input className="i" name="name" defaultValue={user.name} autoComplete="name" /></label>
        <label className="f">Email<input className="i" type="email" name="email" defaultValue={user.email ?? ""} autoComplete="email" placeholder="you@example.com" /></label>
        <div className="small muted">Cellphone <span className="mono">{prettyPhone(user.phone)}</span> is how you sign in.</div>
        <div className="lbl">Notifications</div>
        <div className="card stack">
          <label className="check"><input type="checkbox" name="consentReminders" defaultChecked={user.consentReminders} /> Booking updates and reminders by SMS and WhatsApp</label>
          <label className="check"><input type="checkbox" name="notifySms" defaultChecked={user.notifySms} /> Use SMS</label>
          <label className="check"><input type="checkbox" name="notifyWhatsapp" defaultChecked={user.notifyWhatsapp} /> Use WhatsApp</label>
          <label className="check"><input type="checkbox" name="consentOffers" defaultChecked={user.consentOffers} /> Offers from shops I&apos;ve visited</label>
          <label className="check"><input type="checkbox" name="lowData" defaultChecked={user.lowData} /> Low-data mode (hides map and photos)</label>
        </div>
        <Submit>Save</Submit>
      </form>
      <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
      <LanguagePicker lang={langFor(user)} />
      <div className="lbl">Appearance</div>
      <ThemeSwitch initial={parseTheme(cookies().get(THEME_COOKIE)?.value)} />

      <div className="lbl">More</div>
      <div className="list">
        {!vendor && <Link className="li" href="/vendor/register"><span className="grow"><b>List your business</b><span>Barbers, car washes, clinics, repairs and more</span></span><span className="chev">›</span></Link>}
        <a className="li" href="/help"><span className="grow"><b>Help and contact</b><span>Questions, deposits and refunds</span></span><span className="chev">›</span></a>
        <a className="li" href="/terms"><span className="grow"><b>Terms of use</b><span>Bookings, deposits and no-shows</span></span><span className="chev">›</span></a>
        <a className="li" href="/privacy"><span className="grow"><b>Privacy policy</b><span>How we protect your details under POPIA</span></span><span className="chev">›</span></a>
        <a className="li" href="/api/me/export"><span className="grow"><b>Download my data</b><span>Everything we hold about you</span></span><span className="chev">›</span></a>
        <a className="li" href="/paia"><span className="grow"><b>PAIA manual</b><span>Information Officer and how to request records</span></span><span className="chev">›</span></a>
      </div>
      <details className="card">
        <summary>Delete my account</summary>
        <form action={deleteAccount} className="stack" style={{ marginTop: 10 }}>
          <p className="small muted">This removes your name, email and number. Past visits stay on the shops&apos; records without your details.</p>
          <input className="i" name="confirm" placeholder="Type DELETE" />
          <Submit className="btn warn">Delete my account</Submit>
        </form>
      </details>
      <form action={signOutAction}><Submit className="btn alt">Sign out</Submit></form>
    </main>
  );
}
