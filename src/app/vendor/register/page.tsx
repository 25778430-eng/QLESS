import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { prettyPhone } from "@/lib/format";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { registerVendor } from "../actions";

export default async function Register({ searchParams }: { searchParams: { error?: string } }) {
  const user = await requireUser();
  if (await db.vendor.findUnique({ where: { ownerId: user.id } })) redirect("/vendor");
  return (
    <main className="main">
      <h1>List your business</h1>
      <Messages searchParams={searchParams} />
      <form action={registerVendor} className="stack" style={{ gap: 12 }}>
        <label className="f">Business name<input className="i" name="name" required /></label>
        <label className="f">Type of business
          <select className="i" name="category" defaultValue="Barber">
            <option>Barber</option><option>Nail technician</option><option>Hair salon</option><option>Other</option>
          </select>
        </label>
        <label className="f">CIPC registration number<input className="i mono" name="cipc" placeholder="2021/483920/07" required /></label>
        <label className="f">Street address<input className="i" name="address" placeholder="12 Jorissen St, Braamfontein, Johannesburg" required /></label>
        <label className="f">Business cellphone<input className="i mono" name="phone" defaultValue={prettyPhone(user.phone)} /></label>
        <div className="fill small">We check every business before it goes live, usually within 1 working day.</div>
        <Submit>Submit for approval</Submit>
      </form>
    </main>
  );
}
