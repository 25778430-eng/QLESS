import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="main oops">
      <Logo size={44} />
      <div className="big">404</div>
      <h1>This page isn&apos;t in the queue</h1>
      <p className="muted">The link may be old, or the shop may no longer be listed on Qless.</p>
      <Link className="btn" href="/">Go home</Link>
      <Link className="btn alt" href="/help">Get help</Link>
    </main>
  );
}
