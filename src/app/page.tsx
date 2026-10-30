import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, staffFor } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LanguagePicker } from "@/components/LanguagePicker";
import { t } from "@/lib/i18n";
import { langFor } from "@/lib/lang";
import { getSettings } from "@/lib/settings";
import { TYPES, enabledTypes } from "@/lib/business-types";

export default async function Home() {
  const user = await currentUser();
  if (user?.role === "ADMIN") redirect("/admin");
  if (user?.role === "VENDOR") redirect("/vendor");
  if (user && (await staffFor(user)).length) redirect("/staff");
  if (user) redirect("/discover");
  const lang = langFor(null);
  const settings = await getSettings();
  const types = enabledTypes(settings.disabledTypes);
  return (
    <div className="site">
      <header className="site-top">
        <Logo size={34} />
        <nav className="site-links" aria-label="Website">
          <a href="#how">How it works</a>
          <a href="#business">For businesses</a>
          <Link href="/discover">Find a place</Link>
          <Link href="/help">Help</Link>
        </nav>
        <div className="row">
          <Link className="btn sm alt" href="/signin?mode=in">Sign in</Link>
          <Link className="btn sm" href="/signin">Create an account</Link>
        </div>
      </header>

      <section className="site-hero">
        <div className="stack" style={{ gap: 18 }}>
          <span className="k">Barbers · car washes · clinics · repairs · offices</span>
          <h1>{t(lang, "home.tagline")}</h1>
          <p className="muted lede">
            Take a ticket from home, see how many people are ahead of you, and get a reminder an hour and 20 minutes before your
            turn. No more waiting rooms.
          </p>
          <div className="row wrap">
            <Link className="btn" href="/signin">Create an account</Link>
            <Link className="btn alt" href="/signin?mode=in">Sign in</Link>
          </div>
          <Link className="small" href="/discover"><b>Or look around first ›</b></Link>
        </div>
        <div className="site-phone" aria-hidden>
          <div className="tkt">
            <div className="tkt-top">
              <span className="k">Home Affairs Braamfontein</span>
              <span className="k">Ticket</span>
              <div className="tkt-no">A027</div>
              <span className="k">Smart ID collection</span>
            </div>
            <div className="tkt-cut" />
            <div className="tkt-bot">
              <b>18 people ahead of you</b>
              <div className="ahead">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}<i className="you" /></div>
              <span>Leave home at 11:05</span>
            </div>
          </div>
          <div className="stub"><span className="l"><span className="t">Shine Bay Car Wash</span><span className="s">Car wash · 0.5 km</span></span><span className="r"><span><b>4</b><span>waiting</span></span></span></div>
          <div className="stub"><span className="l"><span className="t">Sharp Lines Barbers</span><span className="s">Barber · 0.6 km</span></span><span className="r"><span><b>2</b><span>waiting</span></span></span></div>
        </div>
      </section>

      <section id="how" className="site-sec">
        <h2>How it works</h2>
        <div className="site-steps">
          <div className="card stack"><span className="k">Step 1</span><b>Find a place</b><span className="muted">Search nearby on the map, scan the QR at the door, or type the shop&apos;s code.</span></div>
          <div className="card stack"><span className="k">Step 2</span><b>Take a ticket</b><span className="muted">Join today&apos;s queue or book a time on another day. Some shops ask for a small deposit that comes off your bill.</span></div>
          <div className="card stack"><span className="k">Step 3</span><b>Arrive on time</b><span className="muted">We tell you by SMS, WhatsApp or push when to leave. When it&apos;s your turn you have 15 minutes to arrive.</span></div>
        </div>
      </section>

      <section className="site-sec">
        <h2>For every kind of queue</h2>
        <div className="site-types">
          {types.map((x) => (
            <div key={x} className="stub"><span className="l"><span className="t">{TYPES[x].label}</span><span className="s">{TYPES[x].hint}</span></span><span className="r"><span><b>{TYPES[x].station[0]!.toUpperCase()}</b><span>{TYPES[x].station}</span></span></span></div>
          ))}
        </div>
      </section>

      <section id="business" className="site-sec site-biz">
        <div className="stack" style={{ gap: 12 }}>
          <h2>Run your queue on Qless</h2>
          <p className="muted lede">List your business, print your QR poster and let customers wait from home. Fewer no-shows, a calmer waiting room and staff who know who&apos;s next.</p>
          <ul className="site-list">
            <li>Each staff member gets their own screen with Call next and breaks</li>
            <li>Prices by size or option, extras, and booking ahead</li>
            <li>Waiting-room TV screen and printed or SMS tickets for walk-ins</li>
            <li>Deposits paid out to your bank, with a Payouts page</li>
          </ul>
          <div className="row wrap"><Link className="btn" href="/signin?next=/vendor/register">List my business</Link><Link className="btn alt" href="/vendor-agreement">Vendor data agreement</Link></div>
        </div>
      </section>

      <footer className="site-foot">
        <Logo size={26} />
        <span className="small muted"><a href="/help">Help</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/paia">PAIA</a></span>
        <div style={{ minWidth: 220 }}><LanguagePicker lang={lang} next="/" /></div>
      </footer>
    </div>
  );
}
