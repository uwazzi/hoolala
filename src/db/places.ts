// WP20: places and check-ins. The only place their SQL lives.
// Coordinates are only ever written as a new place's own location.

import { localityKey } from "../rules/checkin";
import type { CheckinAttemptReason, CheckinMethod, CheckinRow, D1Database, PlaceKind, PlaceRow } from "../types";

const LIVE = "status != 'hidden'";

/** Places in a box around a point; the caller filters by exact radius. */
export async function placesInBox(
  db: D1Database,
  box: { minLat: number; maxLat: number; minLng: number; maxLng: number },
): Promise<PlaceRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM places WHERE ${LIVE} AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? LIMIT 50`,
    )
    .bind(box.minLat, box.maxLat, box.minLng, box.maxLng)
    .all<PlaceRow>();
  return results;
}

export async function getPlace(db: D1Database, id: string): Promise<PlaceRow | null> {
  return db.prepare(`SELECT * FROM places WHERE id = ? AND ${LIVE}`).bind(id).first<PlaceRow>();
}

export async function getPlaceBySlug(db: D1Database, slug: string): Promise<PlaceRow | null> {
  return db.prepare(`SELECT * FROM places WHERE slug = ? AND ${LIVE}`).bind(slug).first<PlaceRow>();
}

export async function getPlaceByCode(db: D1Database, code: string): Promise<PlaceRow | null> {
  return db.prepare(`SELECT * FROM places WHERE code = ? AND ${LIVE}`).bind(code).first<PlaceRow>();
}

export async function getPlaceByExternal(
  db: D1Database,
  provider: "osm" | "google",
  externalId: string,
): Promise<PlaceRow | null> {
  const column = provider === "osm" ? "osm_id" : "google_place_id";
  return db.prepare(`SELECT * FROM places WHERE ${column} = ?`).bind(externalId).first<PlaceRow>();
}

/** Name search inside one town or village (compared by its key), for when location fails. */
export async function searchPlaces(db: D1Database, cityKey: string, query: string, limit: number): Promise<PlaceRow[]> {
  const like = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const { results } = await db
    .prepare(
      `SELECT * FROM places WHERE ${LIVE} AND city_key = ? AND name LIKE ? ESCAPE '\\' ORDER BY name LIMIT ?`,
    )
    .bind(cityKey, like, limit)
    .all<PlaceRow>();
  return results;
}

export interface NewPlace {
  id: string;
  slug: string;
  name: string;
  kind: PlaceKind;
  city: string | null;
  lat: number;
  lng: number;
  googlePlaceId?: string | null;
  osmId?: string | null;
  addedBy: string | null;
  createdAt: string;
}

export async function insertPlace(db: D1Database, p: NewPlace): Promise<void> {
  await db
    .prepare(
      `INSERT INTO places (id, slug, name, kind, city, city_key, lat, lng, google_place_id, osm_id, added_by, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    )
    .bind(p.id, p.slug, p.name, p.kind, p.city, p.city ? localityKey(p.city) : null, p.lat, p.lng, p.googlePlaceId ?? null, p.osmId ?? null, p.addedBy, p.createdAt)
    .run();
}

/** Points for adding a place stay pending until someone else checks in there (WP25 counts them). */
export async function insertAddPlaceContribution(
  db: D1Database,
  c: { id: string; userId: string; placeId: string; month: string; createdAt: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO place_contributions (id, user_id, place_id, fact_id, action, points, state, month, created_at)
       VALUES (?, ?, ?, NULL, 'add_place', 10, 'pending', ?, ?)`,
    )
    .bind(c.id, c.userId, c.placeId, c.month, c.createdAt)
    .run();
}

/** The first check-in by someone other than the person who added the place makes it active. */
export async function markFirstOtherCheckin(db: D1Database, placeId: string, userId: string, nowIso: string): Promise<void> {
  await db
    .prepare(
      `UPDATE places SET first_other_checkin_at = ?, status = 'active'
       WHERE id = ? AND first_other_checkin_at IS NULL AND added_by IS NOT NULL AND added_by != ?`,
    )
    .bind(nowIso, placeId, userId)
    .run();
}

export async function getActiveCheckin(
  db: D1Database,
  userId: string,
  nowIso: string,
): Promise<(CheckinRow & { place_slug: string; place_name: string; place_kind: PlaceKind }) | null> {
  return db
    .prepare(
      `SELECT c.*, p.slug AS place_slug, p.name AS place_name, p.kind AS place_kind
       FROM checkins c JOIN places p ON p.id = c.place_id
       WHERE c.user_id = ? AND c.left_at IS NULL AND c.ends_at > ?
       ORDER BY c.started_at DESC LIMIT 1`,
    )
    .bind(userId, nowIso)
    .first();
}

/** One active check-in per person: a new one ends the old one and hides its signals. */
export async function startCheckin(
  db: D1Database,
  c: { id: string; userId: string; placeId: string; method: CheckinMethod; startedAt: string; endsAt: string },
): Promise<void> {
  await db.batch([
    ...leaveStatements(db, c.userId, c.startedAt),
    db
      .prepare("INSERT INTO checkins (id, user_id, place_id, method, started_at, ends_at, left_at) VALUES (?, ?, ?, ?, ?, ?, NULL)")
      .bind(c.id, c.userId, c.placeId, c.method, c.startedAt, c.endsAt),
  ]);
}

function leaveStatements(db: D1Database, userId: string, nowIso: string) {
  return [
    db
      .prepare(
        `UPDATE signals SET state = 'expired'
         WHERE owner_id = ? AND state IN ('open', 'full')
           AND place_id IN (SELECT place_id FROM checkins WHERE user_id = ? AND left_at IS NULL AND ends_at > ?)`,
      )
      .bind(userId, userId, nowIso),
    db
      .prepare("UPDATE checkins SET left_at = ? WHERE user_id = ? AND left_at IS NULL AND ends_at > ?")
      .bind(nowIso, userId, nowIso),
  ];
}

/** I'M LEAVING: ends the check-in and hides the person's open signals there. */
export async function leaveCheckin(db: D1Database, userId: string, nowIso: string): Promise<void> {
  await db.batch(leaveStatements(db, userId, nowIso));
}

/** Metrics only: method, ok and reason. Never a person, never coordinates. */
export async function insertCheckinAttempt(
  db: D1Database,
  a: { id: string; placeId: string | null; method: CheckinMethod; ok: boolean; reason: CheckinAttemptReason | null; createdAt: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO checkin_attempts (id, place_id, method, ok, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(a.id, a.placeId, a.method, a.ok ? 1 : 0, a.reason, a.createdAt)
    .run();
}

/** PEEK: up to 3 open topics at a place, topic text only. */
export async function openTopics(db: D1Database, placeId: string, nowIso: string, limit = 3): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT topic FROM signals WHERE place_id = ? AND audience = 'place' AND state = 'open' AND expires_at > ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(placeId, nowIso, limit)
    .all<{ topic: string }>();
  return results.map((r) => r.topic);
}
