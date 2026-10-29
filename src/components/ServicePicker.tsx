import type { Service } from "@prisma/client";
import { rand } from "@/lib/format";
import { priceFrom, serviceOptions } from "@/lib/pricing";
import { typeInfo } from "@/lib/business-types";

/** Services with their price options (like car sizes) and extras, for joining or booking. */
export function ServicePicker({ services, businessType, chosen }: { services: Service[]; businessType: string; chosen?: string }) {
  const info = typeInfo(businessType);
  const main = services.filter((s) => !s.isExtra);
  const extras = services.filter((s) => s.isExtra);
  const first = chosen ?? (main[0] ? (serviceOptions(main[0])[0] ? `${main[0].id}::${serviceOptions(main[0])[0]!.label}` : main[0].id) : "");
  return (
    <>
      <h3>Choose a service</h3>
      <div className="card" style={{ padding: "4px 14px" }}>
        {main.map((s) => {
          const opts = serviceOptions(s);
          const p = priceFrom(s);
          return (
            <div key={s.id} className="svc-block">
              {opts.length === 0 ? (
                <label className="svc">
                  <span><input type="radio" name="service" value={s.id} defaultChecked={first === s.id} /> <b>{s.name}</b><br /><span className="small muted">{s.durationMins} min{info.free ? " · Free" : ""}</span></span>
                  <span className="p">{info.free && s.priceCents === 0 ? "Free" : rand(s.priceCents)}</span>
                </label>
              ) : (
                <>
                  <div className="svc"><span><b>{s.name}</b></span><span className="p small">{p.from ? "from " : ""}{rand(p.cents)}</span></div>
                  <div className="chips" style={{ paddingBottom: 10 }}>
                    {opts.map((o) => (
                      <label key={o.label} className="chip">
                        <input type="radio" name="service" value={`${s.id}::${o.label}`} defaultChecked={first === `${s.id}::${o.label}`} />
                        {o.label} · {rand(o.priceCents)}
                      </label>
                    ))}
                  </div>
                </>
              )}
              {s.bring && <p className="small muted bring">Bring: {s.bring}</p>}
            </div>
          );
        })}
      </div>
      {extras.length > 0 && (
        <>
          <h3>Add extras</h3>
          <div className="chips">
            {extras.map((e) => (
              <label key={e.id} className="chip"><input type="checkbox" name="extraIds" value={e.id} /> + {e.name} · {rand(e.priceCents)}</label>
            ))}
          </div>
        </>
      )}
      {info.plates && <label className="f">Number plate<input className="i mono shopcode-in" name="plate" placeholder="CA 123 456" required /></label>}
      {info.jobs && <label className="f">What needs fixing<input className="i" name="item" placeholder="iPhone 12, cracked screen" required /></label>}
    </>
  );
}
