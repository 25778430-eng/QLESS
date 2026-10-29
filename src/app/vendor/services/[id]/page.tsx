import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { ServiceFields } from "@/components/ServiceFields";
import { removeService, saveService } from "../../actions";

export default async function EditService({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const { vendor } = await requireVendor();
  const s = await db.service.findFirst({ where: { id: params.id, vendorId: vendor.id, active: true } });
  if (!s) notFound();
  return (
    <main className="main">
      <Link className="small" href="/vendor/setup#services">‹ Services and prices</Link>
      <h1>Edit {s.name}</h1>
      <Messages searchParams={searchParams} />
      <form action={saveService} className="stack" style={{ gap: 12 }}>
        <input type="hidden" name="id" value={s.id} />
        <ServiceFields s={s} businessType={vendor.businessType} />
        <Submit>Save</Submit>
      </form>
      <form action={removeService}><input type="hidden" name="id" value={s.id} /><Submit className="btn warn">Remove this service</Submit></form>
    </main>
  );
}
