import { Scanner } from "@/components/Scanner";

export default function Scan() {
  return (
    <main className="main">
      <h2>Scan the shop&apos;s QR</h2>
      <p className="muted">Every Qless shop has a QR code at the door. Point your camera at it to open their queue.</p>
      <Scanner />
      <p className="small muted">You can also scan it with your phone&apos;s normal camera app.</p>
    </main>
  );
}
