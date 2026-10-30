import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadQueue } from "@/lib/bookings";
import { Submit } from "@/components/Submit";
import { moveBackAction } from "../../actions";

export default async function Move({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const b = await db.booking.findFirst({ where: { id: params.id, customerId: user.id }, include: { queueDay: true } });
  if (!b) notFound();
  if (b.status !== "WAITING" || b.movedBack) redirect(`/bookings/${b.id}`);
  const view = await loadQueue(b.queueDay);
  const behind = view.entries.filter((e) => e.status === "WAITING" && e.position > b.position);
  const options = [1, 2, 3].filter((n) => n <= Math.max(1, behind.length));
  const minsFor = (n: number) => behind.slice(0, n).reduce((s, e) => s + e.durationMins, 0) / Math.max(1, b.queueDay.staffIds.length);
  return (
    <main className="main">
      <h2>Move my spot back</h2>
      <p className="muted">Running late? Let people behind you go first and keep your deposit.</p>
      {behind.length === 0 ? (
        <div className="fill">Nobody is behind you yet, so there&apos;s no one to swap with. Check back in a bit.</div>
      ) : (
        <form action={moveBackAction} className="stack">
          <input type="hidden" name="bookingId" value={b.id} />
          {options.map((n, i) => (
            <label key={n} className="opt">
              <input type="radio" name="places" value={n} defaultChecked={i === 0} />
              <span className="grow"><b>{n} place{n > 1 ? "s" : ""} back</b><br /><span className="small muted">About {Math.round(minsFor(n))} minutes later</span></span>
            </label>
          ))}
          <Submit>Move me back</Submit>
        </form>
      )}
    </main>
  );
}
