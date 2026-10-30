import { requireUser } from "@/lib/auth";
import { prettyPhone } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { SubHead } from "@/components/SetRow";
import { deleteAccount, updateProfile } from "../actions";

export const dynamic = "force-dynamic";

export default async function Profile({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const user = await requireUser();
  return (
    <main className="main app">
      <SubHead back="/account" backLabel="Account" title="Profile" />
      <Messages searchParams={searchParams} />
      <form action={updateProfile} className="stack" style={{ gap: 12 }}>
        <label className="f">Full name<input className="i" name="name" defaultValue={user.name} autoComplete="name" /></label>
        <label className="f">Email<input className="i" type="email" name="email" defaultValue={user.email ?? ""} autoComplete="email" placeholder="you@example.com" /></label>
        <Submit>Save</Submit>
      </form>
      <details className="card" id="delete">
        <summary>Delete my account</summary>
        <form action={deleteAccount} className="stack" style={{ marginTop: 10 }}>
          <input className="i" name="confirm" placeholder="Type DELETE" />
          <Submit className="btn warn">Delete my account</Submit>
        </form>
      </details>
    </main>
  );
}
