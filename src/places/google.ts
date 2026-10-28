// WP20: Google Places API (New), live. Field masks always set; the key goes in
// a header, never a URL. Nothing is stored except the place id; Google's
// coordinates are used only to measure distance within the request.

import type { Point } from "../rules/checkin";
import type { Env, PlaceKind } from "../types";
import { type MapPlace, PROVIDER_TIMEOUT_MS } from "./types";

const BASE = "https://places.googleapis.com/v1";
const FIELDS = "id,displayName,primaryType,location";

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  primaryType?: string;
  location?: { latitude?: number; longitude?: number };
}

export function googleKind(type: string | undefined): PlaceKind | null {
  if (!type) return null;
  if (["cafe", "coffee_shop", "tea_house", "bakery"].includes(type)) return "cafe";
  if (["bar", "pub", "wine_bar", "cocktail_bar"].includes(type)) return "bar";
  if (type === "library") return "library";
  if (type === "coworking_space") return "coworking";
  return null;
}

function toMapPlace(p: GooglePlace): MapPlace | null {
  const kind = googleKind(p.primaryType);
  const name = p.displayName?.text;
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  if (!p.id || !kind || !name || lat === undefined || lng === undefined) return null;
  return { provider: "google", id: p.id, name: name.slice(0, 60), kind, point: { lat, lng } };
}

function headers(env: Env, mask: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-goog-api-key": env.GOOGLE_MAPS_KEY ?? "",
    "x-goog-fieldmask": mask,
  };
}

export async function googleNearby(env: Env, point: Point, radiusM: number): Promise<MapPlace[]> {
  const res = await fetch(`${BASE}/places:searchNearby`, {
    method: "POST",
    headers: headers(env, FIELDS.split(",").map((f) => `places.${f}`).join(",")),
    body: JSON.stringify({
      includedTypes: ["cafe", "coffee_shop", "bar", "pub", "library", "coworking_space"],
      maxResultCount: 10,
      locationRestriction: { circle: { center: { latitude: point.lat, longitude: point.lng }, radius: radiusM } },
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`google ${res.status}`);
  const body = (await res.json()) as { places?: GooglePlace[] };
  return (body.places ?? []).map(toMapPlace).filter((p): p is MapPlace => p !== null);
}

export async function googleLookup(env: Env, id: string): Promise<MapPlace | null> {
  if (!/^[A-Za-z0-9_-]{10,300}$/.test(id)) return null;
  const res = await fetch(`${BASE}/places/${id}`, {
    headers: headers(env, FIELDS),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return toMapPlace((await res.json()) as GooglePlace);
}
