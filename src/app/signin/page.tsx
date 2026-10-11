import { Logo } from "@/components/Logo";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { sendCode } from "./actions";

export default function SignIn({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return (
    <main className="main">
      <div className="stack" style={{ paddingTop: 12 }}>
        <Logo size={48} />
        <p className="muted">Book your spot. Arrive when it&apos;s your turn.</p>
      </div>
      <Messages searchParams={searchParams} />
      <form action={sendCode} className="stack" style={{ gap: 14 }}>
        <input type="hidden" name="next" value={searchParams.next ?? "/"} />
        <label className="f">
          Cellphone number
          <input className="i mono" name="phone" inputMode="tel" autoComplete="tel" placeholder="082 555 0147" required />
        </label>
        <label className="f">
          Full name <span className="small">(new accounts only)</span>
          <input className="i" name="name" autoComplete="name" placeholder="Lerato Mokoena" />
        </label>
        <div className="fill small">We&apos;ll send a 6-digit code by SMS to confirm it&apos;s you.</div>
        <label className="check">
          <input type="checkbox" name="consentReminders" defaultChecked /> I agree that Qless may send me booking updates and
          reminders by SMS, WhatsApp and push.
        </label>
        <label className="check">
          <input type="checkbox" name="consentOffers" /> Send me offers from shops I&apos;ve visited. (Optional)
        </label>
        <p className="small muted">
          We keep your details safe under POPIA and never sell them. You can change this any time in Account. By continuing
          you agree to our <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.
        </p>
        <Submit>Send code</Submit>
      </form>
    </main>
  );
}
