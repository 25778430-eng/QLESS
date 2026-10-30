import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { WalkInFields } from "@/components/WalkInFields";
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
        <WalkInFields services={services} businessType={vendor.businessType} />
        <Submit>Add to my queue</Submit>
      </form>
    </main>
  );
}
