import { redirect } from "next/navigation";
import { shopByCode } from "@/lib/discover";
import { Scanner } from "@/components/Scanner";

export const dynamic = "force-dynamic";

export default async function Scan({ searchParams }: { searchParams: { code?: string } }) {
  const typed = (searchParams.code ?? "").trim();
  const shop = typed ? await shopByCode(typed) : null;
  if (shop) redirect(`/v/${shop.slug}`);
  return (
    <main className="main">
      <h2>Scan the shop&apos;s QR</h2>
      <p className="muted">Every Qless shop has a QR code at the door. Point your camera at it to open their queue.</p>
      <Scanner />

      <form action="/scan" className="card stack">
        <b>Camera not working? Type the shop code</b>
        <span className="small muted">It&apos;s the 6 letters and numbers under the QR code, like K7Q 4MZ.</span>
        {typed && <div className="error">No shop has the code {typed.toUpperCase()}. Check it and try again.</div>}
        <div className="row">
          <input className="i grow mono shopcode-in" name="code" defaultValue={typed} placeholder="K7Q 4MZ" autoCapitalize="characters" autoComplete="off" maxLength={9} aria-label="Shop code" required />
          <button className="btn sm">Go</button>
        </div>
      </form>
    </main>
  );
}
