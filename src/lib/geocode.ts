import "server-only";

/** Looks up an address with OpenStreetMap Nominatim (free, no key; max 1 request a second). */
export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=za&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Qless/0.1 (booking app)" }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as Array<{ lat: string; lon: string }>;
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}
