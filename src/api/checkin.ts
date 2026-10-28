// WP20: checking in. POST /api/checkin · POST /api/checkin/leave · GET /api/checkin
// Ways in: a place found by location, a map place picked nearby, search by
// name in a city, a partner code, or a poster key. Never depends on a model.
// Coordinates are checked and discarded; only a newly picked map place keeps
// a location (OSM's own, or the person's for Google, whose coordinates we may not store).

import {
  getActiveCheckin,
  getPlace,
  getPlaceByCode,
  getPlaceByExternal,
  getPlaceBySlug,
  insertCheckinAttempt,
  insertPlace,
  leaveCheckin,
  markFirstOtherCheckin,
  startCheckin,
} from "../db/places";
import { coordsStorable, mapLookup } from "../places/provider";
import { ensureSample } from "../db/sample";
import { localityFor } from "../places/geocode";
import { SAMPLE_PLACE } from "../rules/sample";
import { checkinEnds, distanceM, localityKey, NEARBY_RADIUS_M, normalizeCode, normalizeLocality, parsePoint, slugify } from "../rules/checkin";
import type { CheckinAttemptReason, CheckinMethod, CheckinView, Env, PlaceRow } from "../types";
import { json } from "./health";
import { overLimit, readJson } from "./request";
import { getSessionUser, sha256Hex } from "./session";

const CHECKIN_LIMIT = { max: 20, windowS: 60 * 60 };

type PlaceRef = Pick<PlaceRow, "id" | "slug" | "name" | "kind">;

export async function checkIn(env: Env, userId: string, place: PlaceRef, method: CheckinMethod, now: Date): Promise<Response> {
  const nowIso = now.toISOString();
  const endsAt = checkinEnds(now);
  await startCheckin(env.DB, { id: crypto.randomUUID(), userId, placeId: place.id, method, startedAt: nowIso, endsAt });
  await markFirstOtherCheckin(env.DB, place.id, userId, nowIso);
  await insertCheckinAttempt(env.DB, { id: crypto.randomUUID(), placeId: place.id, method, ok: true, reason: null, createdAt: nowIso });
  const view: CheckinView = {
    place: { id: place.id, slug: place.slug, name: place.name, kind: place.kind },
    method,
    endsAt,
  };
  return json({ checkin: view });
}

async function refuse(
  env: Env,
  method: CheckinMethod,
  reason: CheckinAttemptReason,
  error: string,
  now: Date,
  placeId: string | null = null,
): Promise<Response> {
  await insertCheckinAttempt(env.DB, { id: crypto.randomUUID(), placeId, method, ok: false, reason, createdAt: now.toISOString() });
  return json({ error }, error === "not_found" ? 404 : 403);
}

export async function handleCheckin(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  if (await overLimit(env, `rl:checkin:${user.id}`, CHECKIN_LIMIT)) return json({ error: "too_many" }, 429);
  const body = await readJson(request);

  // Partner code: four letters on the poster.
  if (body.code !== undefined) {
    const code = normalizeCode(body.code);
    if (code === SAMPLE_PLACE.code) await ensureSample(env.DB, now);
    const place = code ? await getPlaceByCode(env.DB, code) : null;
    if (!place) return refuse(env, "code", "wrong_code", "wrong_code", now);
    return checkIn(env, user.id, place, "code", now);
  }

  // Poster QR: the place's slug and its secret key.
  if (body.key !== undefined) {
    const place = typeof body.slug === "string" ? await getPlaceBySlug(env.DB, body.slug) : null;
    const ok = place?.poster_key_hash && typeof body.key === "string" && (await sha256Hex(body.key)) === place.poster_key_hash;
    if (!place || !ok) return refuse(env, "qr", "bad_key", "bad_key", now, place?.id ?? null);
    return checkIn(env, user.id, place, "qr", now);
  }

  // Search by name: no coordinates, but only within the city the person chose.
  if (body.method === "search") {
    const place = typeof body.placeId === "string" ? await getPlace(env.DB, body.placeId) : null;
    if (!place) return refuse(env, "search", "out_of_city", "not_found", now);
    const city = normalizeLocality(body.city);
    if (!city || place.city_key !== localityKey(city)) return refuse(env, "search", "out_of_city", "out_of_city", now, place.id);
    return checkIn(env, user.id, place, "search", now);
  }

  // Everything else is by location: the person must be within the place's radius.
  const point = parsePoint(body.lat, body.lng);
  if (!point) return json({ error: "bad_location" }, 400);

  if (typeof body.placeId === "string") {
    const place = await getPlace(env.DB, body.placeId);
    if (!place || place.lat === null || place.lng === null) return refuse(env, "location", "no_places_nearby", "not_found", now);
    if (distanceM(point, { lat: place.lat, lng: place.lng }) > place.radius_m) {
      return refuse(env, "location", "no_places_nearby", "too_far", now, place.id);
    }
    return checkIn(env, user.id, place, "location", now);
  }

  // A map place picked from the nearby list: fetched again by id, never trusted from the client.
  const ext = body.external as { provider?: unknown; id?: unknown } | undefined;
  if (ext && (ext.provider === "osm" || ext.provider === "google") && typeof ext.id === "string") {
    const existing = await getPlaceByExternal(env.DB, ext.provider, ext.id);
    if (existing && existing.status !== "hidden") {
      if (existing.lat !== null && existing.lng !== null && distanceM(point, { lat: existing.lat, lng: existing.lng }) > existing.radius_m) {
        return refuse(env, "location", "no_places_nearby", "too_far", now, existing.id);
      }
      return checkIn(env, user.id, existing, "location", now);
    }
    const found = await mapLookup(env, ext.provider, ext.id);
    if (!found) return refuse(env, "location", "no_places_nearby", "not_found", now);
    if (distanceM(point, found.point) > NEARBY_RADIUS_M) return refuse(env, "location", "no_places_nearby", "too_far", now);
    const where = coordsStorable(found.provider) ? found.point : point;
    const id = crypto.randomUUID();
    const place = { id, slug: slugify(found.name, id.slice(0, 6)), name: found.name, kind: found.kind };
    await insertPlace(env.DB, {
      ...place,
      city: await localityFor(where),
      lat: where.lat,
      lng: where.lng,
      osmId: found.provider === "osm" ? found.id : null,
      googlePlaceId: found.provider === "google" ? found.id : null,
      addedBy: null,
      createdAt: now.toISOString(),
    });
    return checkIn(env, user.id, place, "location", now);
  }

  return json({ error: "bad_request" }, 400);
}

export async function handleLeave(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  await leaveCheckin(env.DB, user.id, now.toISOString());
  return json({ ok: true });
}

export async function handleGetCheckin(request: Request, env: Env, now = new Date()): Promise<Response> {
  const user = await getSessionUser(request, env, now);
  if (!user) return json({ error: "signed_out" }, 401);
  const row = await getActiveCheckin(env.DB, user.id, now.toISOString());
  if (!row) return json({ checkin: null });
  const view: CheckinView = {
    place: { id: row.place_id, slug: row.place_slug, name: row.place_name, kind: row.place_kind },
    method: row.method,
    endsAt: row.ends_at,
  };
  return json({ checkin: view });
}
