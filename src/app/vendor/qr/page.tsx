import { requireVendor } from "@/lib/auth";
import { appUrl } from "@/lib/http";
import { Logo } from "@/components/Logo";
import { PrintButton } from "@/components/PrintButton";

export default async function Qr() {
  const { vendor } = await requireVendor();
  const url = `${appUrl()}/v/${vendor.slug}`;
  return (
    <main className="main">
      <h2 className="noprint">Your QR poster</h2>
      <div className="card stack poster">
        <Logo size={36} />
        <b style={{ fontSize: 20 }}>{vendor.name}</b>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/${vendor.slug}`} alt={`QR code for ${url}`} />
        <span>Scan to join the queue</span>
        <span className="small muted mono">{url.replace(/^https?:\/\//, "")}</span>
      </div>
      <p className="small muted noprint">Print this and stick it at your door. Walk-ins can scan it to join without waiting inside.</p>
      {vendor.status !== "APPROVED" && <div className="fill small noprint">Your QR code works once your business is approved.</div>}
      <PrintButton />
    </main>
  );
}
