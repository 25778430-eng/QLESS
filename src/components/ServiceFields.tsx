import type { Service } from "@prisma/client";
import { optionLines, serviceOptions } from "@/lib/pricing";
import { typeInfo } from "@/lib/business-types";

/** Fields for adding or editing a service, an option list (like car sizes) or an extra. */
export function ServiceFields({ s, businessType }: { s?: Service; businessType: string }) {
  const info = typeInfo(businessType);
  const example = info.plates ? "Small car | 80 | 30\nSUV | 120 | 45\nBakkie | 110 | 40" : info.jobs ? "Small job | 150 | 30\nBig job | 450 | 90" : "Short hair | 150 | 45\nLong hair | 250 | 90";
  return (
    <>
      <label className="f">Name<input className="i" name="name" defaultValue={s?.name} placeholder={info.plates ? "Full wash" : info.free ? "Smart ID collection" : "Skin fade"} required /></label>
      <div className="row">
        <label className="f grow">Minutes<input className="i mono" type="number" name="duration" min="0" max="480" defaultValue={s?.durationMins ?? 30} /></label>
        <label className="f grow">Price (R)<input className="i mono" type="number" name="price" min="0" step="0.5" defaultValue={s ? s.priceCents / 100 : info.free ? 0 : 120} /></label>
      </div>
      <label className="check"><input type="checkbox" name="isExtra" defaultChecked={s?.isExtra} /> <span><b>This is an extra</b> or a product sold on top (wax, a drink, a phone cover). Customers add it to a service.</span></label>
      <details open={!!s && serviceOptions(s).length > 0}>
        <summary className="small">Different prices by size or type (optional)</summary>
        <label className="f" style={{ marginTop: 8 }}>
          One per line: name | price | minutes
          <textarea className="i mono" name="options" rows={4} defaultValue={s ? optionLines(serviceOptions(s)) : ""} placeholder={example} />
        </label>
        <span className="small muted">Customers pick one. Leave empty for one price.</span>
      </details>
      <details open={!!(s?.ticketLetter || s?.bring)}>
        <summary className="small">Ticket letter and what to bring (optional)</summary>
        <div className="stack" style={{ marginTop: 8 }}>
          <label className="f">Ticket letter<input className="i mono" name="ticketLetter" maxLength={1} defaultValue={s?.ticketLetter ?? ""} placeholder="A" style={{ width: 80 }} /></label>
          <label className="f">Bring with you<input className="i" name="bring" defaultValue={s?.bring ?? ""} placeholder="ID book, proof of address" /></label>
        </div>
      </details>
    </>
  );
}
