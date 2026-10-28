import { redirect } from "next/navigation";
import { requireVendor } from "@/lib/auth";
import { PAUSE_REASONS, todayQueue } from "@/lib/bookings";
import { db } from "@/lib/db";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { pauseAction } from "../actions";

const MINUTES = [[15, "15 min"], [30, "30 min"], [60, "1 hour"], [120, "2 hours"]] as const;

export default async function Pause(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const { vendor } = await requireVendor();
  const day = await todayQueue(vendor.id);
  if (!day || day.status !== "OPEN") redirect("/vendor");
  const waiting = await db.booking.count({ where: { queueDayId: day.id, status: "WAITING", customerId: { not: null } } });
  return (
    <main className="main">
      <h2>Pause the queue</h2>
      <p className="muted">Everyone waiting gets a message with their new time. Nobody loses their deposit.</p>
      <Messages searchParams={searchParams} />
      <form action={pauseAction} className="stack" style={{ gap: 12 }}>
        <h3>Why?</h3>
        <div className="chips">
          {Object.keys(PAUSE_REASONS).map((r, i) => (
            <label key={r} className="chip" style={{ position: "relative" }}><input type="radio" name="reason" value={r} defaultChecked={i === 0} />{r}</label>
          ))}
        </div>
        <h3>For how long?</h3>
        <div className="chips">
          {MINUTES.map(([m, label]) => (
            <label key={m} className="chip" style={{ position: "relative" }}><input type="radio" name="minutes" value={m} defaultChecked={m === 30} />{label}</label>
          ))}
        </div>
        <Submit>Pause and notify {waiting} customer{waiting === 1 ? "" : "s"}</Submit>
      </form>
    </main>
  );
}
