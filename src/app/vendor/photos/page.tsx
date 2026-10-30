import { requireVendor } from "@/lib/auth";
import { db } from "@/lib/db";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { PhotoInput } from "@/components/PhotoInput";
import { SubHead } from "@/components/SetRow";
import { addPhoto, removePhoto } from "../actions";

export const dynamic = "force-dynamic";

export default async function Photos({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { vendor } = await requireVendor();
  const photos = await db.photo.findMany({ where: { vendorId: vendor.id }, select: { id: true, caption: true }, orderBy: { createdAt: "desc" } });
  return (
    <main className="main app">
      <SubHead back="/vendor/account" backLabel="Account" title="Photos" />
      <Messages searchParams={searchParams} />
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
