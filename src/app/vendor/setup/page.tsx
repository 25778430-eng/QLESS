import Link from "next/link";
import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { rand } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { PhotoInput } from "@/components/PhotoInput";
import { UseMyLocation } from "@/components/UseMyLocation";
import { addPhoto, addService, removePhoto, saveShop } from "../actions";
import { ServiceFields } from "@/components/ServiceFields";
import { priceFrom, serviceOptions } from "@/lib/pricing";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function Setup({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { vendor } = await requireVendor();
  const [services, staff, photos] = await Promise.all([
    db.service.findMany({ where: { vendorId: vendor.id, active: true }, orderBy: { priceCents: "asc" } }),
    db.staff.findMany({ where: { vendorId: vendor.id, active: true }, orderBy: { name: "asc" } }),
    db.photo.findMany({ where: { vendorId: vendor.id }, select: { id: true, caption: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <main className="main">
      <h1>Shop setup</h1>
      <Messages searchParams={searchParams} />

      <form action={saveShop} className="stack" style={{ gap: 12 }}>
        <h3>Open days and hours</h3>
        <div className="days">
          {DAYS.map((d, i) => (
            <label key={i} title={DAY_NAMES[i]} style={{ position: "relative" }}>
              <input type="checkbox" name={`day${i}`} defaultChecked={vendor.openDays[i] === "1"} aria-label={DAY_NAMES[i]} />{d}
            </label>
          ))}
        </div>
        <div className="row">
          <label className="f grow">Opens<input className="i mono" type="time" name="openTime" defaultValue={vendor.openTime} /></label>
          <label className="f grow">Closes<input className="i mono" type="time" name="closeTime" defaultValue={vendor.closeTime} /></label>
        </div>
        {vendor.level === "BASIC" ? (
          <>
            <input type="hidden" name="deposit" value={vendor.depositCents / 100} />
            <input type="hidden" name="refundHours" value={vendor.refundWindowMins / 60} />
            <p className="small muted">Basic shops don&apos;t take deposits. Become Verified in Account to take them.</p>
          </>
        ) : (<>
        <h3>Deposit</h3>
        <div className="row">
          <label className="f grow">Deposit (R)<input className="i mono" type="number" min="0" max="1000" step="1" name="deposit" defaultValue={vendor.depositCents / 100} /></label>
          <label className="f grow">Refund if cancelled (hours before)<input className="i mono" type="number" min="0" max="48" step="0.5" name="refundHours" defaultValue={vendor.refundWindowMins / 60} /></label>
        </div>
        <p className="small muted">The deposit comes off the customer&apos;s final price. No-shows lose it.</p>
        </>)}
        <h3>Location</h3>
        <label className="f">Street address<input className="i" name="address" defaultValue={vendor.address} /></label>
        <UseMyLocation hasLocation={vendor.lat != null} />
        <Submit>Save shop details</Submit>
      </form>

      <h3 id="services">Services and prices</h3>
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

      <h3 id="staff">Staff</h3>
      <Link className="li card" href="/vendor/team"><span className="grow"><b>My team</b><span>{staff.length ? `${staff.length} on the team · ` : ""}Add or remove people, logins and hours</span></span><span className="chev">›</span></Link>

      <h3>Photo gallery</h3>
      {photos.length > 0 && (
        <div className="gallery">
          {photos.map((p) => (
            <figure key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/photos/${p.id}`} alt={p.caption || "Shop photo"} />
              <form action={removePhoto} className="row between">
                <figcaption>{p.caption}</figcaption>
                <input type="hidden" name="id" value={p.id} /><button className="btn sm alt" aria-label="Remove photo">✕</button>
              </form>
            </figure>
          ))}
        </div>
      )}
      <form action={addPhoto} className="card stack">
        <PhotoInput name="photo" accept="image/jpeg,image/png,image/webp" required />
        <input className="i" name="caption" placeholder="Caption, e.g. Skin fade" maxLength={40} />
        <Submit className="btn alt">Upload photo</Submit>
        <span className="small muted">JPG, PNG or WebP. Big phone photos are made smaller for you. Up to 12 photos.</span>
      </form>
    </main>
  );
}
