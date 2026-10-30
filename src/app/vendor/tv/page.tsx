import { requireVendor } from "@/lib/auth";
import { appUrl } from "@/lib/http";
import { ensureShopCode } from "@/lib/discover";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { resetTvLink } from "../actions";

export default async function TvSetup({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { vendor } = await requireVendor();
  const code = await ensureShopCode(vendor);
  const link = vendor.tvKey ? `${appUrl()}/tv/${code}?k=${vendor.tvKey}` : null;
  return (
    <main className="main">
      <h1>Waiting-room screen</h1>
      <Messages searchParams={searchParams} />
      <p className="muted">Put a TV or an old tablet in your waiting area. It shows the ticket being served and who&apos;s next, plus a QR code so walk-ins can join. It shows ticket numbers only, never names.</p>
      {link ? (
        <>
          <div className="card stack">
            <span className="lbl">Open this link on the TV</span>
            <span className="mono small" style={{ wordBreak: "break-all" }}>{link}</span>
            <a className="btn alt" href={link} target="_blank" rel="noopener">Open the screen</a>
          </div>
          <form action={resetTvLink}><Submit className="btn alt">Make a new link (stops the old one)</Submit></form>
        </>
      ) : (
        <form action={resetTvLink}><Submit>Make my TV link</Submit></form>
      )}
      <p className="small muted">Keep the link private. Anyone with it can see your queue numbers.</p>
    </main>
  );
}
