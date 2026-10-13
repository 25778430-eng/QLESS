"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

type Pin = { lat: number; lng: number; label: string; href: string; busy: boolean; featured?: boolean };
type Props = { here: { lat: number; lng: number } | null; pins: Pin[]; height?: number };

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
const JOBURG = { lat: -26.1929, lng: 28.0305 };

/**
 * Map of nearby shops. Uses Google Maps when NEXT_PUBLIC_GOOGLE_MAPS_KEY is set,
 * otherwise OpenStreetMap, which needs no key.
 */
export function VendorMap({ here, pins, height = 240 }: Props) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const center = here ?? (pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : JOBURG);
    const zoom = here ? 14 : 12;
    return GOOGLE_KEY ? googleMap(el.current, center, zoom, here, pins) : osmMap(el.current, center, zoom, here, pins);
  }, [here, pins]);
  return <div ref={el} className="map" style={{ height }} aria-label="Map of nearby shops" />;
}

function pinHtml(p: Pin): string {
  const cls = p.featured ? "gpin feat" : p.busy ? "gpin busy" : "gpin";
  return `<a class="${cls}" href="${escapeHtml(p.href)}">${p.featured ? "★ " : ""}${escapeHtml(p.label)}</a>`;
}

function osmMap(node: HTMLElement, center: { lat: number; lng: number }, zoom: number, here: Props["here"], pins: Pin[]) {
  let map: import("leaflet").Map | undefined;
  let cancelled = false;
  import("leaflet").then((L) => {
    if (cancelled) return;
    map = L.map(node, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    if (here) L.circleMarker([here.lat, here.lng], { radius: 8, color: "#4285f4", fillOpacity: 0.9 }).addTo(map);
    for (const p of pins) L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: pinHtml(p) }) }).addTo(map);
  });
  return () => {
    cancelled = true;
    map?.remove();
  };
}

let googleLoading: Promise<any> | null = null;
function loadGoogle(): Promise<any> {
  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);
  googleLoading ??= new Promise((resolve, reject) => {
    w.__qlessMapsReady = () => resolve(w.google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&callback=__qlessMapsReady&loading=async`;
    s.async = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return googleLoading;
}

function googleMap(node: HTMLElement, center: { lat: number; lng: number }, zoom: number, here: Props["here"], pins: Pin[]) {
  let cancelled = false;
  const overlays: any[] = [];
  loadGoogle()
    .then((google) => {
      if (cancelled) return;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches && document.documentElement.dataset.theme !== "light";
      const map = new google.maps.Map(node, {
        center,
        zoom,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        colorScheme: dark || document.documentElement.dataset.theme === "dark" ? "DARK" : "LIGHT",
      });
      if (here) {
        overlays.push(new google.maps.Marker({
          position: here,
          map,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#4285f4", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
        }));
      }
      // Each shop is a chip showing its name and wait, drawn as an HTML overlay.
      class Chip extends google.maps.OverlayView {
        div: HTMLDivElement | null = null;
        constructor(private pin: Pin) { super(); }
        onAdd() {
          this.div = document.createElement("div");
          this.div.style.position = "absolute";
          this.div.innerHTML = pinHtml(this.pin);
          this.getPanes().overlayMouseTarget.appendChild(this.div);
        }
        draw() {
          const pt = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.pin.lat, this.pin.lng));
          if (pt && this.div) { this.div.style.left = `${pt.x}px`; this.div.style.top = `${pt.y}px`; }
        }
        onRemove() { this.div?.remove(); this.div = null; }
      }
      for (const p of pins) {
        const c = new Chip(p);
        c.setMap(map);
        overlays.push(c);
      }
    })
    .catch(() => {
      if (!cancelled) node.textContent = "The map couldn't load. Check your connection.";
    });
  return () => {
    cancelled = true;
    for (const o of overlays) o.setMap(null);
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
