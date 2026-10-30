import { requireVendor } from "@/lib/auth";
import { appUrl } from "@/lib/http";
import { ensureShopCode } from "@/lib/discover";
import { prettyShopCode } from "@/lib/shop-code";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";

export default async function Qr() {
  const { vendor } = await requireVendor();
  const url = `${appUrl()}/v/${vendor.slug}`;
  const code = await ensureShopCode(vendor);
  return (
    <main className="main">
      <h2 className="noprint">Your QR poster</h2>
      <div className="card stack poster">
        <Logo size={36} />
        <b style={{ fontSize: 20 }}>{vendor.name}</b>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/${vendor.slug}`} alt={`QR code for ${url}`} />
        <span>Scan to join the queue</span>
        <span className="small muted">or open Qless, tap Scan and type</span>
        <span className="shopcode">{prettyShopCode(code)}</span>
        <span className="small muted mono">{url.replace(/^https?:\/\//, "")}</span>
      </div>
      <p className="small muted noprint">
        Print this and stick it at your door. Walk-ins can scan it to join without waiting inside. If someone&apos;s camera won&apos;t
        scan, they type the code instead. You can also read the code out over the phone.
      </p>
      {vendor.status !== "APPROVED" && <div className="fill small noprint">Your QR code and shop code work once your business is approved.</div>}
      <PrintButton />
    </main>
  );
}
