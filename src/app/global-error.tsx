"use client";
import "./globals.css";

/** Last-resort screen when the root layout itself fails. It has to render its own html and body. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-ZA">
      <body>
        <div className="shell">
          <main className="main oops">
            <h1>Qless is having a moment</h1>
            <p className="muted">Your bookings are safe. Please try again in a minute.</p>
            <button className="btn" onClick={() => reset()}>Try again</button>
          </main>
        </div>
      </body>
    </html>
  );
}
