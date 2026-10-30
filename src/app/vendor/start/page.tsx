import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { worksToday } from "@/lib/bookings";
import { longDate } from "@/lib/format";
import { dailyCapacity } from "@/lib/queue";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { openToday } from "../actions";

export default async function Start({ searchParams }: { searchParams: { error?: string } }) {
  const { vendor } = await requireVendor();
  const [staff, services] = await Promise.all([
    db.staff.findMany({ where: { vendorId: vendor.id, active: true }, orderBy: { name: "asc" } }),
    db.service.findMany({ where: { vendorId: vendor.id, active: true } }),
  ]);
  const avg = services.length ? services.reduce((s, x) => s + x.durationMins, 0) / services.length : 30;
  const perStaff = dailyCapacity(1, vendor.openTime, vendor.closeTime, avg);
  return (
    <main className="main">
      <h2>Start today&apos;s queue</h2>
      <p className="muted">{longDate()} · {vendor.openTime}–{vendor.closeTime}</p>
      <Messages searchParams={searchParams} />
      {staff.length === 0 || services.length === 0 ? (
        <>
          <div className="fill">Add your staff and services before you open a queue.</div>
          <div className="two">
            <Link className="btn alt" href="/vendor/team">My team</Link>
            <Link className="btn" href="/vendor/services">Services</Link>
          </div>
        </>
      ) : (
        <form action={openToday} className="stack" style={{ gap: 12 }}>
          <div className="card stack" style={{ gap: 12 }}>
            <b>Who&apos;s working today?</b>
            <div className="chips">
              {staff.map((s) => (
                <label key={s.id} className="chip" style={{ position: "relative" }}>
                  <input type="checkbox" name="staffIds" value={s.id} defaultChecked={worksToday(s)} /> {s.name}
                </label>
              ))}
            </div>
            <span className="small muted">Each staff member adds room for about {perStaff} customers today. Bookings close when the queue is full.</span>
          </div>
          <Submit>Open the queue</Submit>
        </form>
      )}
    </main>
  );
}
