import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { SubHead } from "@/components/SetRow";
import { ServiceFields } from "@/components/ServiceFields";
import { priceFrom, serviceOptions } from "@/lib/pricing";
import { addService } from "../actions";

export const dynamic = "force-dynamic";

export default async function Services({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { vendor } = await requireVendor();
  const services = await db.service.findMany({ where: { vendorId: vendor.id, active: true }, orderBy: { priceCents: "asc" } });
  return (
    <main className="main app">
      <SubHead back="/vendor/account" backLabel="Account" title="Services and prices" />
      <Messages searchParams={searchParams} />
      <div className="card" style={{ padding: "4px 14px" }}>
        {services.length === 0 && <p className="muted" style={{ padding: "10px 0" }}>No services yet.</p>}
        {services.map((s) => {
          const p = priceFrom(s);
          const opts = serviceOptions(s);
          return (
            <Link className="svc" key={s.id} href={`/vendor/services/${s.id}`} style={{ textDecoration: "none" }}>
              <span>
                <b>{s.isExtra ? `+ ${s.name}` : s.name}</b>{s.ticketLetter && <span className="pill" style={{ marginLeft: 6 }}>{s.ticketLetter}</span>}<br />
                <span className="small muted">{s.isExtra ? "Extra" : `${s.durationMins} min`}{opts.length ? ` · ${opts.map((o) => o.label).join(", ")}` : ""}</span>
              </span>
              <span className="row"><span className="p">{p.from ? "from " : ""}{p.cents === 0 ? "Free" : rand(p.cents)}</span><span className="chev">›</span></span>
            </Link>
          );
        })}
      </div>
      <details className="card">
        <summary>+ Add a service, option list or extra</summary>
        <form action={addService} className="stack" style={{ marginTop: 10 }}>
          <ServiceFields businessType={vendor.businessType} />
          <Submit>Add</Submit>
        </form>
      </details>

    </main>
  );
}
