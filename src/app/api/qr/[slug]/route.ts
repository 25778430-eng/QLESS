import QRCode from "qrcode";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/http";

/** QR code PNG that opens a shop's queue page. */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const vendor = await db.vendor.findUnique({ where: { slug: params.slug } });
  if (!vendor) return new Response("Not found", { status: 404 });
  const png = await QRCode.toBuffer(`${appUrl()}/v/${vendor.slug}`, { width: 600, margin: 1, errorCorrectionLevel: "M" });
  return new Response(png, { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
}
