import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayQueue } from "@/lib/bookings";
import { WalkInFields } from "@/components/WalkInFields";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { walkInAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function WalkIn({ searchParams }: { searchParams: { error?: string } }) {
  const { vendor } = await requireVendor();
  const day = await todayQueue(vendor.id);
  if (!day || day.status === "CLOSED") {
    return (
      <main className="main">
        <h1>Add a walk-in</h1>
        <p className="muted">Open today&apos;s queue first.</p>
        <Link className="btn" href="/vendor">Go to the queue</Link>
      </main>
    );
  }
  const staff = await db.staff.findMany({ where: { id: { in: day.staffIds } } });
  const services = await db.service.findMany({ where: { vendorId: vendor.id, active: true }, orderBy: { name: "asc" } });
  return (
    <main className="main">
      <h1>Add a walk-in</h1>
      <Messages searchParams={searchParams} />
      <form action={walkInAction} className="stack" style={{ gap: 12 }}>
        <WalkInFields services={services} businessType={vendor.businessType} />
        <label className="f">Who<select className="i" name="staffId"><option value="any">Anyone available</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <Submit>Add to the queue</Submit>
      </form>
    </main>
  );
}
