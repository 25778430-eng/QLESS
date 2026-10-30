import { requireVendor } from "@/lib/auth";
import { Messages } from "@/components/Messages";
import { Submit } from "@/components/Submit";
import { SubHead } from "@/components/SetRow";
import { UseMyLocation } from "@/components/UseMyLocation";
import { saveShop } from "../actions";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const dynamic = "force-dynamic";

/** Shop profile: only where the shop is and when it's open. */
export default async function ShopProfile({ searchParams }: { searchParams: { error?: string; notice?: string } }) {
  const { vendor } = await requireVendor();
  return (
    <main className="main app">
      <SubHead back="/vendor/account" backLabel="Account" title="Shop profile" />
      <Messages searchParams={searchParams} />
      <form action={saveShop} className="stack" style={{ gap: 12 }}>
        <h3>Open days and hours</h3>
        <div className="days">
          {DAYS.map((d, i) => (
            <label key={i} title={DAY_NAMES[i]} style={{ position: "relative" }}>
              <input type="checkbox" name={`day${i}`} defaultChecked={vendor.openDays[i] === "1"} aria-label={DAY_NAMES[i]} />{d}
            </label>
          ))}
        </div>
        <div className="row">
          <label className="f grow">Opens<input className="i mono" type="time" name="openTime" defaultValue={vendor.openTime} /></label>
          <label className="f grow">Closes<input className="i mono" type="time" name="closeTime" defaultValue={vendor.closeTime} /></label>
        </div>
        <h3>Location</h3>
        <label className="f">Street address<input className="i" name="address" defaultValue={vendor.address} /></label>
        <UseMyLocation hasLocation={vendor.lat != null} />
        <Submit>Save</Submit>
      </form>
    </main>
  );
}
