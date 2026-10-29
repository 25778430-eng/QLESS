import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, staffFor } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export default async function Home() {
  const user = await currentUser();
  if (user?.role === "ADMIN") redirect("/admin");
  if (user?.role === "VENDOR") redirect("/vendor");
  if (user && (await staffFor(user)).length) redirect("/staff");
  if (user) redirect("/discover");
  return (
    <main className="main" style={{ justifyContent: "center", paddingBottom: 24 }}>
      <Logo size={56} />
      <h1>Book your spot. Arrive when it&apos;s your turn.</h1>
      <p className="muted">
        Join the queue at barbers, nail techs and salons near you. Pay a small deposit, get a reminder an hour and 20 minutes
        before, and skip the waiting room.
      </p>
      <Link className="btn" href="/signin">Create an account</Link>
      <Link className="btn alt" href="/signin?mode=in">Sign in</Link>
      <Link className="btn alt" href="/signin?next=/vendor/register">I&apos;m a vendor</Link>
      <p className="small muted" style={{ textAlign: "center" }}>
        <a href="/help">Help</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/paia">PAIA</a>
      </p>
    </main>
  );
}
