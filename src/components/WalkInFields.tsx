import type { Service } from "@prisma/client";
import { rand } from "@/lib/format";
import { serviceOptions } from "@/lib/pricing";
import { typeInfo } from "@/lib/business-types";

/** The fields shared by the owner's and the staff walk-in forms. */
export function WalkInFields({ services, businessType }: { services: Service[]; businessType: string }) {
  const info = typeInfo(businessType);
  return (
    <>
      <label className="f">Name (optional)<input className="i" name="name" placeholder="Walk-in" /></label>
      <label className="f">Cellphone for an SMS ticket (optional)<input className="i mono" name="phone" inputMode="tel" placeholder="082 123 4567" /></label>
      <label className="f">Service
        <select className="i" name="service">
          {services.filter((s) => !s.isExtra).map((s) => {
            const opts = serviceOptions(s);
            return opts.length ? (
              <optgroup key={s.id} label={s.name}>
                {opts.map((o) => <option key={o.label} value={`${s.id}::${o.label}`}>{s.name} · {o.label} · {rand(o.priceCents)}</option>)}
              </optgroup>
            ) : (
              <option key={s.id} value={s.id}>{s.name} · {rand(s.priceCents)}</option>
            );
          })}
        </select>
      </label>
      {info.plates && <label className="f">Number plate<input className="i mono shopcode-in" name="plate" placeholder="CA 123 456" /></label>}
      {info.jobs && <label className="f">What needs fixing<input className="i" name="item" placeholder="Samsung A14, cracked screen" /></label>}
      <label className="check"><input type="checkbox" name="print" /> <span>Print a paper ticket</span></label>
    </>
  );
}
