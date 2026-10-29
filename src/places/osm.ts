// WP20: OpenStreetMap through the Overpass API. Open data (ODbL); the app
// shows "> openstreetmap" beside these places.

import type { Point } from "../rules/checkin";
import type { PlaceKind } from "../types";
import { type MapPlace, PROVIDER_TIMEOUT_MS } from "./types";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "Hoolala/0.1 (+https://hoolala.hg-labs.io)";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function osmKind(tags: Record<string, string>): PlaceKind | null {
  if (tags.amenity === "cafe") return "cafe";
  if (tags.amenity === "bar" || tags.amenity === "pub") return "bar";
  if (tags.amenity === "library") return "library";
  if (tags.amenity === "coworking_space" || tags.office === "coworking") return "coworking";
  return null;
}

export function toMapPlace(el: OverpassElement): MapPlace | null {
  const tags = el.tags ?? {};
  const kind = osmKind(tags);
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!kind || !tags.name || lat === undefined || lng === undefined) return null;
  const website = tags.website ?? tags["contact:website"] ?? null;
  return {
    provider: "osm",
    id: `${el.type}/${el.id}`,
    name: tags.name.slice(0, 60),
    kind,
    point: { lat, lng },
    website: website ? website.slice(0, 200) : null,
  };
}

async function overpass(query: string): Promise<OverpassElement[]> {
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": USER_AGENT },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`overpass ${res.status}`);
  const body = (await res.json()) as { elements?: OverpassElement[] };
  return body.elements ?? [];
}

export async function osmNearby(point: Point, radiusM: number): Promise<MapPlace[]> {
  const around = `around:${Math.round(radiusM)},${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
  const query = `[out:json][timeout:5];(
    nwr(${around})[amenity~"^(cafe|bar|pub|library|coworking_space)$"][name];
    nwr(${around})[office=coworking][name];
  );out center 20;`;
  return (await overpass(query)).map(toMapPlace).filter((p): p is MapPlace => p !== null);
}

export async function osmLookup(id: string): Promise<MapPlace | null> {
  const match = /^(node|way|relation)\/(\d{1,15})$/.exec(id);
  if (!match) return null;
  const [, type, num] = match;
  const elements = await overpass(`[out:json][timeout:5];${type}(${num});out center 1;`);
  return elements.length ? toMapPlace(elements[0]) : null;
}
