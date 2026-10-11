"use client";
import { useState } from "react";

/** Fills hidden lat/lng fields from the device's location, for shops whose address doesn't geocode well. */
export function UseMyLocation({ hasLocation }: { hasLocation: boolean }) {
  const [pos, setPos] = useState<{ lat: string; lng: string } | null>(null);
  const [msg, setMsg] = useState(hasLocation ? "Your shop is on the map." : "Your shop isn't on the map yet.");
  return (
    <div className="row between fill" style={{ padding: "10px 14px" }}>
      <input type="hidden" name="lat" value={pos?.lat ?? ""} />
      <input type="hidden" name="lng" value={pos?.lng ?? ""} />
      <span className="small">{msg}</span>
      <button
        type="button"
        className="btn sm alt"
        onClick={() =>
          navigator.geolocation?.getCurrentPosition(
            (p) => {
              setPos({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) });
              setMsg("Location captured. Save to update the map.");
            },
            () => setMsg("Couldn't get your location."),
          )
        }
      >
        I&apos;m at the shop
      </button>
    </div>
  );
}
