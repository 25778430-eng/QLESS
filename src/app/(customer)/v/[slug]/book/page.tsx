import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { BOOK_AHEAD_DAYS, slotsOn, typeSwitchedOn } from "@/lib/bookings";
import { rand, sastDate, sastWeekday } from "@/lib/format";
import { quote, serviceOptions } from "@/lib/pricing";
import { typeInfo } from "@/lib/business-types";
import { vendorListed } from "@/lib/plan-billing";
import { splitServiceChoice } from "@/lib/walk-in";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { joinQueue } from "../actions";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short" });

/** Book a set time on a later day: pick a service and a day, then a free time. */
export default async function BookLater({ params, searchParams }: { params: { slug: string }; searchParams: { service?: string; date?: string; error?: string } }) {
  const vendor = await db.vendor.findUnique({
    where: { slug: params.slug },
    include: { services: { where: { active: true }, orderBy: { priceCents: "asc" } }, staff: { where: { active: true } } },
  });
  if (!vendor || vendor.status !== "APPROVED" || !(await vendorListed(vendor)) || !(await typeSwitchedOn(vendor.businessType))) notFound();
  const user = await currentUser();
  const info = typeInfo(vendor.businessType);
  const main = vendor.services.filter((s) => !s.isExtra);

  // The next open days, starting tomorrow.
  const days: string[] = [];
  for (let i = 1; i <= BOOK_AHEAD_DAYS; i++) {
    const d = new Date(Date.now() + i * 86_400_000);
    if (vendor.openDays[sastWeekday(d)] === "1") days.push(sastDate(d));
  }
  const choice = searchParams.service ?? "";
  const { serviceId, optionLabel } = splitServiceChoice(choice);
  const service = main.find((s) => s.id === serviceId);
  const q = service ? quote(service, optionLabel) : null;
  const date = days.includes(searchParams.date ?? "") ? searchParams.date! : null;
  const slots = q && date ? await slotsOn(vendor, date, q.durationMins) : [];

  return (
    <main className="main">
      <Link className="small" href={`/v/${vendor.slug}`}>‹ {vendor.name}</Link>
      <h1>Book a later day</h1>
      <Messages searchParams={searchParams} />
      {days.length === 0 ? (
        <p className="muted">{vendor.name} has no open days in the next {BOOK_AHEAD_DAYS} days.</p>
      ) : (
        <form className="stack" style={{ gap: 12 }} action={`/v/${vendor.slug}/book`}>
          <label className="f">Service
            <select className="i" name="service" defaultValue={choice}>
              <option value="">Pick a service</option>
              {main.map((s) => {
                const opts = serviceOptions(s);
                return opts.length ? (
                  <optgroup key={s.id} label={s.name}>{opts.map((o) => <option key={o.label} value={`${s.id}::${o.label}`}>{s.name} · {o.label} · {rand(o.priceCents)}</option>)}</optgroup>
                ) : (
                  <option key={s.id} value={s.id}>{s.name} · {info.free && s.priceCents === 0 ? "Free" : rand(s.priceCents)}</option>
                );
              })}
            </select>
          </label>
          <div className="lbl">Day</div>
          <div className="chips">
            {days.map((d) => (
              <label key={d} className="chip"><input type="radio" name="date" value={d} defaultChecked={d === date} />{DAY.format(new Date(`${d}T12:00:00+02:00`))}</label>
            ))}
          </div>
          <button className="btn alt">Show free times</button>
        </form>
      )}

      {q && date && service && (
        !user ? (
          <Link className="btn" href={`/signin?next=${encodeURIComponent(`/v/${vendor.slug}/book?service=${choice}&date=${date}`)}`}>Sign in to book</Link>
        ) : (
          <form action={joinQueue} className="stack" style={{ gap: 12 }}>
            <input type="hidden" name="vendorId" value={vendor.id} />
            <input type="hidden" name="service" value={choice} />
            <input type="hidden" name="date" value={date} />
            <h3>Free times on {DAY.format(new Date(`${date}T12:00:00+02:00`))}</h3>
            {slots.every((s) => !s.free) ? (
              <p className="muted">That day is fully booked. Pick another day.</p>
            ) : (
              <div className="slots">
                {slots.map((s) => (
                  <label key={s.at} className={`chip${s.free ? "" : " off"}`}>
                    <input type="radio" name="slot" value={s.at} disabled={!s.free} required />{s.at}
                  </label>
                ))}
              </div>
            )}
            {vendor.staff.length > 1 && (
              <label className="f">Who
                <select className="i" name="staffId"><option value="any">Anyone available</option>{vendor.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              </label>
            )}
            {info.plates && <label className="f">Number plate<input className="i mono shopcode-in" name="plate" placeholder="CA 123 456" required /></label>}
            {info.jobs && <label className="f">What needs fixing<input className="i" name="item" placeholder="iPhone 12, cracked screen" required /></label>}
            {service.bring && <p className="small muted bring">Bring: {service.bring}</p>}
            <div className="fill small">
              {service.name}{q.optionLabel ? ` · ${q.optionLabel}` : ""} · {q.durationMins} min · {info.free && q.priceCents === 0 ? "Free" : rand(q.priceCents)}
              {!info.free && vendor.level === "VERIFIED" && vendor.depositCents > 0 && <> · {rand(Math.min(vendor.depositCents, q.priceCents))} deposit now</>}
            </div>
            <Submit>Book this time</Submit>
          </form>
        )
      )}
    </main>
  );
}
