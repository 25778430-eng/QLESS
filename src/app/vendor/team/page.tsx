import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone, time } from "@/lib/format";
import { worksToday } from "@/lib/bookings";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { addStaff, removeStaff, saveStaffHours, setStaffPhone } from "../actions";

export const dynamic = "force-dynamic";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** The owner's team: add and remove people, give them a login, and set each person's own hours. */
export default async function Team({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { vendor } = await requireVendor();
  const staff = await db.staff.findMany({ where: { vendorId: vendor.id, active: true }, orderBy: { name: "asc" } });
  const now = new Date();
  return (
    <main className="main">
      <h1>My team</h1>
      <Messages searchParams={searchParams} />

      <form action={addStaff} className="card stack">
        <b>Add someone</b>
        <input className="i" name="name" placeholder="Name" required />
        <input className="i mono" name="phone" inputMode="tel" placeholder="Cellphone (optional)" />
        <span className="small muted">With a cellphone number they can sign in to their own chair screen, call their own clients and take breaks.</span>
        <Submit className="btn sm">Add to team</Submit>
      </form>

      {staff.length === 0 && <p className="muted">No staff yet. Add yourself if you work alone.</p>}
      {staff.map((s) => {
        const onBreak = s.breakUntil && s.breakUntil > now;
        const status = onBreak ? `On a break until ${time(s.breakUntil)}` : worksToday(s, now) ? "Works today" : "Off today";
        return (
          <details key={s.id} className="card">
            <summary className="row between" style={{ listStyle: "none" }}>
              <span className="avatar sm">{s.name.slice(0, 1).toUpperCase()}</span>
              <span className="grow">
                <b>{s.name}</b><br />
                <span className="small muted">{status} · {s.startTime && s.endTime ? `${s.startTime} to ${s.endTime}` : `shop hours (${vendor.openTime} to ${vendor.closeTime})`}</span>
              </span>
              <span className={`pill ${onBreak ? "sig" : worksToday(s, now) ? "ok" : ""}`}>{onBreak ? "Break" : worksToday(s, now) ? "In" : "Off"}</span>
            </summary>

            <form action={saveStaffHours} className="stack" style={{ marginTop: 12, gap: 10 }}>
              <input type="hidden" name="id" value={s.id} />
              <div className="lbl">Works on</div>
              <div className="days">
                {DAYS.map((d, i) => (
                  <label key={i} title={DAY_NAMES[i]} style={{ position: "relative" }}>
                    <input type="checkbox" name={`day${i}`} defaultChecked={s.workDays[i] === "1"} aria-label={DAY_NAMES[i]} />{d}
                  </label>
                ))}
              </div>
              <div className="row">
                <label className="f grow">Starts<input className="i mono" type="time" name="startTime" defaultValue={s.startTime ?? ""} /></label>
                <label className="f grow">Finishes<input className="i mono" type="time" name="endTime" defaultValue={s.endTime ?? ""} /></label>
              </div>
              <div className="row">
                <label className="f grow">Lunch from<input className="i mono" type="time" name="lunchStart" defaultValue={s.lunchStart ?? ""} /></label>
                <label className="f grow">Lunch to<input className="i mono" type="time" name="lunchEnd" defaultValue={s.lunchEnd ?? ""} /></label>
              </div>
              <span className="small muted">Leave the times blank to use the shop&apos;s hours. Clients can&apos;t book {s.name} for a time after they finish, and nobody is booked into their lunch.</span>
              <Submit className="btn sm">Save hours</Submit>
            </form>

            <form action={setStaffPhone} className="row" style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={s.id} />
              <label className="f grow">Login cellphone
                <input className="i mono" name="phone" inputMode="tel" placeholder="082 555 0147" defaultValue={s.phone ? prettyPhone(s.phone) : ""} />
              </label>
              <Submit className="btn sm alt">Save</Submit>
            </form>

            <form action={removeStaff} style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={s.id} />
              <Submit className="btn sm warn">Remove {s.name} from the team</Submit>
            </form>
          </details>
        );
      })}
    </main>
  );
}
