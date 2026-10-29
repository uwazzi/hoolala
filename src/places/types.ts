// Shared by the map providers. Kept separate so provider.ts and the adapters
// don't import each other.
import type { Point } from "../rules/checkin";
import type { PlaceKind } from "../types";

export interface MapPlace {
  provider: "osm" | "google";
  id: string;
  name: string;
  kind: PlaceKind;
  /** Used to measure distance in the request. Only OSM's may be stored (see coordsStorable). */
  point: Point;
  /** The place's own site, when the provider lists one: READ IT's way in. */
  website?: string | null;
}

export const PROVIDER_TIMEOUT_MS = 5000;
