// WP20: finding a place. POST /api/places/nearby · GET /api/places/search ·
// POST /api/places (ADD THIS PLACE) · GET /api/places/:slug/peek (public).
// The person's coordinates are used for the lookup and then discarded; they
// are only ever saved as a new place's own location.

import { getPlaceBySlug, insertAddPlaceContribution, insertPlace, openTopics, placesInBox, searchPlaces } from "../db/places";
import { mapNearby } from "../places/provider";
import {
  cityFor,
  distanceBand,
  distanceM,
  isCity,
  isPlaceKind,
  MAX_NEARBY,
  MAX_SEARCH,
  NEARBY_RADIUS_M,
  normalizePlaceName,
  normalizeQuery,
  parsePoint,
  placeNameProblem,
  type Point,
  slugify,
} from "../rules/checkin";
import type { Env, NearbyPlace, PlaceRow, PlaceSummary } from "../types";
import { checkIn } from "./checkin";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser } from "./session";

export const PLACE_LIMITS = {
  nearby: { max: 30, windowS: 10 * 60 },
  search: { max: 30, windowS: 10 * 60 },
  add: { max: 5, windowS: 24 * 60 * 60 },
} as const;

export function summary(p: Pick<PlaceRow, "id" | "slug" | "name" | "kind">): PlaceSummary {
  return { id: p.id, slug: p.slug, name: p.name, kind: p.kind };
}

/** A box a little bigger than the radius; the exact distance is checked after. */
function box(p: Point, radiusM: number) {
  const dLat = radiusM / 111_000;
  const dLng = radiusM / (111_000 * Math.cos((p.lat * Math.PI) / 180));
  return { minLat: p.lat - dLat, maxLat: p.lat + dLat, minLng: p.lng - dLng, maxLng: p.lng + dLng };
}

export async function handleNearby(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const point = parsePoint(body.lat, body.lng);
  if (!point) return json({ error: "bad_location" }, 400);
  if (await overLimit(env, `rl:nearby:${user.id}`, PLACE_LIMITS.nearby)) return json({ error: "too_many" }, 429);

  // Hoolala! places first, then map places that aren't in Hoolala! yet.
  const ours = (await placesInBox(env.DB, box(point, NEARBY_RADIUS_M * 4)))
    .map((p) => ({ p, d: distanceM(point, { lat: p.lat ?? 0, lng: p.lng ?? 0 }) }))
    .filter(({ p, d }) => p.lat !== null && p.lng !== null && d <= p.radius_m)
    .sort((a, b) => a.d - b.d);
  const known = new Set(ours.flatMap(({ p }) => [p.osm_id, p.google_place_id]).filter(Boolean));
  const map = (await mapNearby(env, point, NEARBY_RADIUS_M))
    .filter((m) => !known.has(m.id))
    .map((m) => ({ m, d: distanceM(point, m.point) }))
    .filter(({ d }) => d <= NEARBY_RADIUS_M)
    .sort((a, b) => a.d - b.d);

  const places: NearbyPlace[] = [
    ...ours.map(({ p, d }) => ({
      ref: { id: p.id },
      name: p.name,
      kind: p.kind,
      band: distanceBand(d),
      source: "hoolala" as const,
    })),
    ...map.map(({ m, d }) => ({
      ref: { provider: m.provider, externalId: m.id },
      name: m.name,
      kind: m.kind,
      band: distanceBand(d),
      source: m.provider,
    })),
  ].slice(0, MAX_NEARBY);

  return json({ places, city: cityFor(point) });
}

export async function handleSearch(request: Request, env: Env): Promise<Response> {
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "signed_out" }, 401);
  const url = new URL(request.url);
  const city = url.searchParams.get("city");
  const q = normalizeQuery(url.searchParams.get("q"));
  if (!isCity(city)) return json({ error: "bad_city" }, 400);
  if (!q) return json({ error: "bad_query" }, 400);
  if (await overLimit(env, `rl:search:${user.id}`, PLACE_LIMITS.search)) return json({ error: "too_many" }, 429);
  const places = await searchPlaces(env.DB, city, q, MAX_SEARCH);
  return json({ places: places.map(summary) });
}

/** ADD THIS PLACE: saved at the person's location, then checked in there. */
export async function handleAddPlace(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const body = await readJson(request);
  const point = parsePoint(body.lat, body.lng);
  if (!point) return json({ error: "bad_location" }, 400);
  if (!isPlaceKind(body.kind)) return json({ error: "bad_kind" }, 400);
  const problem = placeNameProblem(body.name);
  if (problem) return json({ error: `name_${problem}` }, 400);
  const name = normalizePlaceName(body.name as string);

  // Already here under the same name? Check in there instead of adding a twin.
  const twin = (await placesInBox(env.DB, box(point, NEARBY_RADIUS_M))).find(
    (p) => p.name.toLowerCase() === name.toLowerCase() && p.lat !== null && p.lng !== null &&
      distanceM(point, { lat: p.lat, lng: p.lng }) <= p.radius_m,
  );
  if (twin) return checkIn(env, user.id, twin, "location", now);

  if (await overLimit(env, `rl:addplace:${user.id}`, PLACE_LIMITS.add)) return json({ error: "too_many" }, 429);
  const id = crypto.randomUUID();
  const nowIso = now.toISOString();
  const place = {
    id,
    slug: slugify(name, id.slice(0, 6)),
    name,
    kind: body.kind,
    city: cityFor(point),
    lat: point.lat,
    lng: point.lng,
    addedBy: user.id,
    createdAt: nowIso,
  };
  await insertPlace(env.DB, place);
  await insertAddPlaceContribution(env.DB, {
    id: crypto.randomUUID(),
    userId: user.id,
    placeId: id,
    month: nowIso.slice(0, 7),
    createdAt: nowIso,
  });
  return checkIn(env, user.id, { id, slug: place.slug, name, kind: place.kind }, "add", now);
}

/** PEEK (public): the place's name and up to 3 open topics. No people. */
export async function handlePeek(slug: string, env: Env, now = new Date()): Promise<Response> {
  const place = await getPlaceBySlug(env.DB, slug);
  if (!place) return json({ error: "not_found" }, 404);
  const topics = await openTopics(env.DB, place.id, now.toISOString());
  return json({ place: { name: place.name, kind: place.kind }, topics });
}

