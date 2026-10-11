import { toggleLowData } from "@/app/(customer)/account/actions";

export function LowDataToggle({ on, signedIn }: { on: boolean; signedIn: boolean }) {
  return (
    <form action={toggleLowData} className="row between fill" style={{ padding: "10px 14px" }}>
      <input type="hidden" name="signedIn" value={signedIn ? "1" : ""} />
      <span className="small"><b>Low-data mode</b><br /><span className="muted">Hides the map and photos</span></span>
      <button className="btn sm alt" aria-pressed={on}>{on ? "On" : "Off"}</button>
    </form>
  );
}
