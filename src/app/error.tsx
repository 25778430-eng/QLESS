"use client";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="main oops">
      <Logo size={44} />
      <div className="banner">Something went wrong on our side</div>
      <h1>Your spot is safe</h1>
      <p className="muted">
        Bookings and deposits aren&apos;t affected. Try again in a moment. If you&apos;re on load-shedding or low signal, check
        your connection.
      </p>
      <button className="btn" onClick={() => reset()}>Try again</button>
      <Link className="btn alt" href="/help">Get help</Link>
    </main>
  );
}
