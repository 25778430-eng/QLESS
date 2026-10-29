import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, staffFor } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LanguagePicker } from "@/components/LanguagePicker";
import { t } from "@/lib/i18n";
import { langFor } from "@/lib/lang";

export default async function Home() {
  const user = await currentUser();
  if (user?.role === "ADMIN") redirect("/admin");
  if (user?.role === "VENDOR") redirect("/vendor");
  if (user && (await staffFor(user)).length) redirect("/staff");
  if (user) redirect("/discover");
  const lang = langFor(null);
  return (
    <main className="main" style={{ justifyContent: "center", paddingBottom: 24 }}>
      <Logo size={56} />
      <h1>{t(lang, "home.tagline")}</h1>
      <p className="muted">
        Join the queue at barbers, salons, car washes, clinics, repair shops and offices near you. Get a reminder an hour and
        20 minutes before, and skip the waiting room.
      </p>
      <Link className="btn" href="/signin">Create an account</Link>
      <Link className="btn alt" href="/signin?mode=in">Sign in</Link>
      <Link className="btn alt" href="/signin?next=/vendor/register">I&apos;m a vendor</Link>
      <LanguagePicker lang={lang} next="/" />
      <p className="small muted" style={{ textAlign: "center" }}>
        <a href="/help">Help</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/paia">PAIA</a>
      </p>
    </main>
  );
}
