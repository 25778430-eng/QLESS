import Link from "next/link";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { prettyPhone } from "@/lib/format";
import { checkCode } from "../actions";

type SP = { phone?: string; next?: string; name?: string; offers?: string; dev?: string; error?: string };

export default function Verify({ searchParams }: { searchParams: SP }) {
  const phone = searchParams.phone ?? "";
  return (
    <main className="main">
      <div className="row"><Link className="btn sm alt" href="/signin">Back</Link><h2>Enter your code</h2></div>
      <p className="muted">Sent to <b className="mono">{phone ? prettyPhone(phone) : ""}</b></p>
      <Messages searchParams={searchParams} />
      {searchParams.dev && (
        <div className="banner">Development mode: SMS is not set up, so your code is <b className="mono">{searchParams.dev}</b></div>
      )}
      <form action={checkCode} className="stack" style={{ gap: 14 }}>
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="next" value={searchParams.next ?? "/"} />
        <input type="hidden" name="name" value={searchParams.name ?? ""} />
        <input type="hidden" name="offers" value={searchParams.offers ?? ""} />
        <input className="i otp" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
        <Submit>Verify and continue</Submit>
      </form>
      <Link className="small muted" href={`/signin?next=${encodeURIComponent(searchParams.next ?? "/")}`}>Didn&apos;t get it? Send a new code</Link>
    </main>
  );
}
