// WP25: place facts and private place points. The only place their SQL lives.
// Google content is never stored here (only web and people facts).

import { DAILY_CAP, POINTS, settles, underCap, WEB_FACT_TTL_MS } from "../rules/places";
import type { ContributionAction, D1Database, FactField, PlaceFactRow } from "../types";

/** Live facts for a card: people's, and web facts under 30 days old. Disputed ones are hidden. */
export async function factsForPlace(db: D1Database, placeId: string, now: Date): Promise<PlaceFactRow[]> {
  const cutoff = new Date(now.getTime() - WEB_FACT_TTL_MS).toISOString();
  const { results } = await db
    .prepare(
      `SELECT * FROM place_facts WHERE place_id = ? AND state != 'disputed' AND (source != 'web' OR updated_at > ?)
       ORDER BY CASE state WHEN 'confirmed' THEN 0 ELSE 1 END, field, updated_at DESC`,
    )
    .bind(placeId, cutoff)
    .all<PlaceFactRow>();
  return results;
}

export async function newestWebFactAt(db: D1Database, placeId: string): Promise<string | null> {
  return db.prepare("SELECT MAX(updated_at) AS t FROM place_facts WHERE place_id = ? AND source = 'web'").bind(placeId).first<string>("t");
}

export async function getFact(db: D1Database, id: string): Promise<PlaceFactRow | null> {
  return db.prepare("SELECT * FROM place_facts WHERE id = ?").bind(id).first<PlaceFactRow>();
}

/** What PLACE IT found replaces the previous web facts; people's facts are untouched. */
export async function replaceWebFacts(
  db: D1Database,
  placeId: string,
  facts: { field: FactField; value: string; url: string }[],
  nowIso: string,
): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM place_facts WHERE place_id = ? AND source = 'web' AND state = 'found' AND id NOT IN (SELECT fact_id FROM place_contributions WHERE fact_id IS NOT NULL)").bind(placeId),
    ...facts.map((f) =>
      db
        .prepare("INSERT INTO place_facts (id, place_id, field, value, source, source_url, state, added_by, confirmations, updated_at) VALUES (?, ?, ?, ?, 'web', ?, 'found', NULL, 0, ?)")
        .bind(crypto.randomUUID(), placeId, f.field, f.value, f.url, nowIso),
    ),
  ]);
}

export async function insertPeopleFact(db: D1Database, f: { id: string; placeId: string; field: FactField; value: string; userId: string; nowIso: string }): Promise<void> {
  await db
    .prepare("INSERT INTO place_facts (id, place_id, field, value, source, source_url, state, added_by, confirmations, updated_at) VALUES (?, ?, ?, ?, 'people', NULL, 'found', ?, 0, ?)")
    .bind(f.id, f.placeId, f.field, f.value, f.userId, f.nowIso)
    .run();
}

export async function confirmFact(db: D1Database, id: string, nowIso: string): Promise<void> {
  await db.prepare("UPDATE place_facts SET confirmations = confirmations + 1, state = 'confirmed', updated_at = ? WHERE id = ?").bind(nowIso, id).run();
}

/** NOT ANY MORE: a confirmed detail goes back to found; a found one is set aside. */
export async function disputeFact(db: D1Database, id: string, nowIso: string): Promise<void> {
  await db
    .prepare(
      `UPDATE place_facts SET state = CASE state WHEN 'confirmed' THEN 'found' ELSE 'disputed' END,
         confirmations = 0, updated_at = ? WHERE id = ?`,
    )
    .bind(nowIso, id)
    .run();
}

/** Records a contribution; false when this person already did it this month (one confirm per detail per month). */
export async function addContribution(
  db: D1Database,
  c: { userId: string; placeId: string; factId: string | null; action: ContributionAction; state: "pending" | "counted"; points: number; month: string; nowIso: string },
): Promise<boolean> {
  const res = await db
    .prepare(
      `INSERT OR IGNORE INTO place_contributions (id, user_id, place_id, fact_id, action, points, state, month, created_at, counted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), c.userId, c.placeId, c.factId, c.action, c.points, c.state, c.month, c.nowIso, c.state === "counted" ? c.nowIso : null)
    .run();
  return (res.meta?.changes ?? 0) === 1;
}

export async function confirmedThisMonth(db: D1Database, userId: string, factId: string, month: string): Promise<boolean> {
  return (
    (await db
      .prepare("SELECT 1 AS x FROM place_contributions WHERE user_id = ? AND fact_id = ? AND action = 'confirm_fact' AND month = ?")
      .bind(userId, factId, month)
      .first<number>("x")) === 1
  );
}

async function countedToday(db: D1Database, userId: string, now: Date): Promise<number> {
  const day = now.toISOString().slice(0, 10);
  return (
    (await db
      .prepare("SELECT COALESCE(SUM(points), 0) AS n FROM place_contributions WHERE user_id = ? AND state = 'counted' AND substr(counted_at, 1, 10) = ?")
      .bind(userId, day)
      .first<number>("n")) ?? 0
  );
}

/** Points that count now, within today's cap. Returns the points actually counted. */
export async function countNow(db: D1Database, userId: string, points: number, now: Date): Promise<number> {
  return underCap(await countedToday(db, userId, now), points);
}

/** Settles this person's pending points: counted, rejected, or still waiting. */
export async function settlePoints(db: D1Database, userId: string, now: Date): Promise<void> {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.action, c.points, c.created_at, c.fact_id, f.state AS fact_state, f.confirmations, p.first_other_checkin_at
       FROM place_contributions c LEFT JOIN place_facts f ON f.id = c.fact_id JOIN places p ON p.id = c.place_id
       WHERE c.user_id = ? AND c.state = 'pending' ORDER BY c.created_at`,
    )
    .bind(userId)
    .all<{ id: string; action: ContributionAction; points: number; created_at: string; fact_id: string | null; fact_state: string | null; confirmations: number | null; first_other_checkin_at: string | null }>();
  const nowIso = now.toISOString();
  for (const c of results) {
    const verdict =
      c.action === "add_place"
        ? c.first_other_checkin_at ? "count" : "wait"
        : settles(c, c.fact_state ? { state: c.fact_state, confirmations: c.confirmations ?? 0 } : null, now);
    if (verdict === "wait") continue;
    if (verdict === "reject") {
      await db.prepare("UPDATE place_contributions SET state = 'rejected' WHERE id = ?").bind(c.id).run();
      continue;
    }
    const points = await countNow(db, userId, c.points, now);
    // Over today's cap: it waits for tomorrow rather than being lost.
    if (points === 0 && c.points > 0) continue;
    await db.prepare("UPDATE place_contributions SET state = 'counted', points = ?, counted_at = ? WHERE id = ?").bind(points, nowIso, c.id).run();
  }
}

/** Private: only ever returned to the person themselves. */
export async function pointsSummary(db: D1Database, userId: string): Promise<{ counted: number; pending: number }> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN state = 'counted' THEN points END), 0) AS counted,
              COALESCE(SUM(CASE WHEN state = 'pending' THEN points END), 0) AS pending
       FROM place_contributions WHERE user_id = ?`,
    )
    .bind(userId)
    .first<{ counted: number; pending: number }>();
  return { counted: row?.counted ?? 0, pending: row?.pending ?? 0 };
}

export { DAILY_CAP, POINTS };
