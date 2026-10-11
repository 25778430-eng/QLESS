"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type Pin = { lat: number; lng: number; label: string; href: string; busy: boolean };

/** OpenStreetMap map of nearby shops. Needs no API key. */
export function VendorMap({ here, pins }: { here: { lat: number; lng: number } | null; pins: Pin[] }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      const center = here ?? (pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : { lat: -26.1929, lng: 28.0305 });
      map = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], here ? 14 : 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      if (here) L.circleMarker([here.lat, here.lng], { radius: 8, color: "#2f7cf6", fillOpacity: 0.9 }).addTo(map);
      for (const p of pins) {
        const icon = L.divIcon({
          className: "",
          html: `<a href="${p.href}" style="display:inline-block;transform:translate(-50%,-100%);white-space:nowrap;font:700 12px Figtree,sans-serif;padding:4px 8px;border-radius:10px 10px 10px 2px;text-decoration:none;background:${p.busy ? "#f5b700" : "#0b0b0b"};color:${p.busy ? "#1d1600" : "#fff"}">${escapeHtml(p.label)}</a>`,
        });
        L.marker([p.lat, p.lng], { icon }).addTo(map);
      }
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [here, pins]);
  return <div ref={el} className="map" aria-label="Map of nearby shops" />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
