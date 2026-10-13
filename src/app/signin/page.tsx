import Link from "next/link";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { sendCode } from "./actions";

type SP = { next?: string; error?: string; mode?: string };

export default function SignIn({ searchParams }: { searchParams: SP }) {
  const signIn = searchParams.mode === "in";
  const next = searchParams.next ?? "/";
  const other = `/signin?${new URLSearchParams({ next, ...(signIn ? {} : { mode: "in" }) })}`;
  return (
    <main className="main">
      <div className="row between">
        <span className="qtile" aria-hidden>Q</span>
        <span className="small muted">
          {signIn ? "New here? " : "Have an account? "}
          <Link href={other}><b>{signIn ? "Create one" : "Sign in"}</b></Link>
        </span>
      </div>
      <div className="hello">
        <small>{signIn ? "Welcome back" : "Welcome to Qless"}</small>
        {signIn ? "Sign in with your number." : <>Skip the wait.<br />Not your spot.</>}
      </div>
      <Messages searchParams={searchParams} />
      <form action={sendCode} className="stack" style={{ gap: 14 }}>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="mode" value={signIn ? "in" : "new"} />
        {!signIn && (
          <>
            <div className="two">
              <label className="f">First name<input className="i" name="firstName" autoComplete="given-name" placeholder="Lerato" required /></label>
              <label className="f">Surname<input className="i" name="surname" autoComplete="family-name" placeholder="Mokoena" required /></label>
            </div>
            <label className="f">Email<input className="i" type="email" name="email" autoComplete="email" inputMode="email" placeholder="lerato.m@gmail.com" required /></label>
          </>
        )}
        <label className="f">
          Cellphone
          <span className="i prefixed"><span className="pre mono">+27</span><input className="mono" name="phone" inputMode="tel" autoComplete="tel" placeholder="82 555 0147" required /></span>
        </label>
        {!signIn && (
          <>
            <label className="check">
              <input type="checkbox" name="consentReminders" defaultChecked /> Send me booking updates and reminders by SMS, WhatsApp and push.
            </label>
            <label className="check">
              <input type="checkbox" name="consentOffers" /> Send me offers from shops I&apos;ve visited. (Optional)
            </label>
            <label className="check">
              <input type="checkbox" name="adult" required /> I&apos;m 18 or older, or my parent or guardian agrees to me using Qless.
            </label>
          </>
        )}
        <Submit>Send my code</Submit>
        <p className="small muted center">
          We&apos;ll SMS a 6-digit code. We keep your details safe under POPIA and never sell them. By continuing you agree to our{" "}
          <a href="/terms">terms</a> and <a href="/privacy">privacy policy</a>.
        </p>
        {!signIn && (
          <Link className="small center" href={`/signin?${new URLSearchParams({ next: "/vendor/register" })}`}><b>Own a business? List it on Qless</b></Link>
        )}
      </form>
    </main>
  );
}
