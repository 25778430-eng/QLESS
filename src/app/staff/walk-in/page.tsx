import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { staffWalkIn } from "../actions";

export default async function StaffWalkIn({ searchParams }: { searchParams: { error?: string } }) {
  const { staff, vendor } = await requireStaff();
  const services = await db.service.findMany({ where: { vendorId: vendor.id, active: true }, orderBy: { name: "asc" } });
  return (
    <main className="main">
      <h1>Add a walk-in for {staff.name}</h1>
      <Messages searchParams={searchParams} />
      <form action={staffWalkIn} className="stack" style={{ gap: 12 }}>
        <label className="f">Name (optional)<input className="i" name="name" placeholder="Walk-in" /></label>
        <label className="f">Service<select className="i" name="serviceId">{services.map((s) => <option key={s.id} value={s.id}>{s.name} · {rand(s.priceCents)}</option>)}</select></label>
        <Submit>Add to my queue</Submit>
      </form>
    </main>
  );
}
