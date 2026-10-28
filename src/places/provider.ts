// WP20: nearby places from a map, fetched live. Results are never written to
// D1 except a picked place's id (and, for OSM only, its public coordinates).

import type { Point } from "../rules/checkin";
import type { Env } from "../types";
import { googleLookup, googleNearby } from "./google";
import { osmLookup, osmNearby } from "./osm";
import type { MapPlace } from "./types";

export type { MapPlace } from "./types";

/** Google's terms forbid storing their coordinates; OSM's are open data (ODbL, attributed). */
export function coordsStorable(provider: MapPlace["provider"]): boolean {
  return provider === "osm";
}

export function activeProvider(env: Env): "osm" | "google" {
  return env.PLACES_PROVIDER === "google" && env.GOOGLE_MAPS_KEY ? "google" : "osm";
}

/** Nearby map places, or an empty list when the provider is slow or down. */
export async function mapNearby(env: Env, point: Point, radiusM: number): Promise<MapPlace[]> {
  try {
    return activeProvider(env) === "google" ? await googleNearby(env, point, radiusM) : await osmNearby(point, radiusM);
  } catch {
    return [];
  }
}

/** Fetches one map place again by id, so the client can't invent a name or a location. */
export async function mapLookup(env: Env, provider: MapPlace["provider"], id: string): Promise<MapPlace | null> {
  try {
    if (provider === "google") return env.GOOGLE_MAPS_KEY ? await googleLookup(env, id) : null;
    return await osmLookup(id);
  } catch {
    return null;
  }
}
