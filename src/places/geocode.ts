// WP20: which town or village a point is in, from OpenStreetMap's Nominatim,
// live. Only the locality name comes back; nothing about the person is
// stored, and the point goes nowhere else. Usage policy: one request at a
// time, an identifying User-Agent, attribution (shown with OSM places).
// Falls back to the fixed city list when Nominatim is slow or down.

import { knownCityName, normalizeLocality, type Point } from "../rules/checkin";
import { PROVIDER_TIMEOUT_MS } from "./types";

const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "Hoolala/0.1 (+https://hoolala.hg-labs.io)";

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  hamlet?: string;
}

/** Village-level name first, then the municipality: what people call the place they're in. */
export function pickLocality(address: NominatimAddress | undefined): string | null {
  if (!address) return null;
  for (const raw of [address.village, address.town, address.city, address.hamlet, address.municipality]) {
    const name = normalizeLocality(raw);
    if (name) return name;
  }
  return null;
}

export async function localityFor(point: Point): Promise<string | null> {
  try {
    const url = `${NOMINATIM}?format=jsonv2&zoom=14&addressdetails=1&lat=${point.lat.toFixed(5)}&lon=${point.lng.toFixed(5)}`;
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, "accept-language": "fr,de,it,en" },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
    if (res.ok) {
      const name = pickLocality(((await res.json()) as { address?: NominatimAddress }).address);
      if (name) return name;
    }
  } catch {
    // Fall through to the known cities.
  }
  return knownCityName(point);
}
