// WP32: talking ratings, visit counts, accepted read links. The only place
// their SQL lives. Ratings are collective only: no endpoint ever returns
// who rated what.

import type { D1Database } from "../types";

/** One value per place, person and day; re-rating the same day replaces. */
export async function ratePlace(
  db: D1Database,
  r: { placeId: string; userId: string; value: number; visitDate: string; nowIso: string },
): Promise<void> {
  await db
    .prepare(
      "INSERT OR REPLACE INTO place_ratings (place_id, user_id, value, visit_date, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(r.placeId, r.userId, r.value, r.visitDate, r.nowIso)
    .run();
}

/** Every rating for a place; the caller labels the last 90 days. */
export async function talkingRatings(db: D1Database, placeId: string): Promise<{ value: number; visit_date: string }[]> {
  const { results } = await db
    .prepare("SELECT value, visit_date FROM place_ratings WHERE place_id = ? ORDER BY visit_date DESC")
    .bind(placeId)
    .all<{ value: number; visit_date: string }>();
  return results;
}

/** Hoolala! check-ins at a place since the cutoff: a pure count. */
export async function visitCount(db: D1Database, placeId: string, cutoffIso: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM checkins WHERE place_id = ? AND started_at >= ?")
    .bind(placeId, cutoffIso)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Accepted facts carrying a source page, menu and price first: READ IT links. */
export async function readLinks(db: D1Database, placeId: string): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT source_url AS url FROM place_facts WHERE place_id = ? AND state = 'confirmed' AND source_url IS NOT NULL
       ORDER BY CASE field WHEN 'menu_item' THEN 0 WHEN 'price' THEN 1 ELSE 2 END LIMIT 2`,
    )
    .bind(placeId)
    .all<{ url: string }>();
  return results.map((r) => r.url);
}
