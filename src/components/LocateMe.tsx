"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LocateMe() {
  const router = useRouter();
  const params = useSearchParams();
  const [msg, setMsg] = useState("");
  return (
    <div className="row between fill" style={{ padding: "10px 14px" }}>
      <span className="small">{msg || "Show shops near me"}</span>
      <button
        type="button"
        className="btn sm"
        onClick={() => {
          if (!navigator.geolocation) return setMsg("Your browser can't share location.");
          setMsg("Finding you…");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const p = new URLSearchParams(params);
              p.set("lat", pos.coords.latitude.toFixed(5));
              p.set("lng", pos.coords.longitude.toFixed(5));
              router.push(`/discover?${p}`);
            },
            () => setMsg("Location is off. Allow it in your browser to see nearby shops."),
            { timeout: 10000, maximumAge: 300000 },
          );
        }}
      >
        Use my location
      </button>
    </div>
  );
}
