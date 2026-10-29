// WP24: the Personal Compass. Private: only the person's own requests read it
// (and FITS YOU, which only orders what they already see). The only place its
// SQL lives. Raw FIND ME findings are never written anywhere.

import type { CompassLine } from "../rules/compass";
import type { CompassItemRow, CompassOrigin, D1Database } from "../types";

export async function getCompass(db: D1Database, userId: string): Promise<CompassItemRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM compass_items WHERE user_id = ? AND active = 1 ORDER BY created_at, rowid")
    .bind(userId)
    .all<CompassItemRow>();
  return results;
}

/** LOOKS RIGHT: the confirmed lines replace whatever was there, and the undo log with them. */
export async function replaceCompass(db: D1Database, userId: string, lines: CompassLine[], origin: CompassOrigin, nowIso: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM compass_items WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM compass_changes WHERE user_id = ?").bind(userId),
    ...lines.map((l) =>
      db
        .prepare("INSERT INTO compass_items (id, user_id, part, text, source_url, origin, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
        .bind(crypto.randomUUID(), userId, l.part, l.text, l.sourceUrl, origin, nowIso),
    ),
  ]);
}

/** SURPRISE ME keep: one new line in the person's own words. */
export async function addCompassLine(
  db: D1Database, userId: string, part: CompassLine["part"], text: string, origin: CompassOrigin, nowIso: string,
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO compass_items (id, user_id, part, text, source_url, origin, active, created_at) VALUES (?, ?, ?, ?, NULL, ?, 1, ?)")
    .bind(id, userId, part, text, origin, nowIso)
    .run();
  return id;
}

export async function removeCompassLine(db: D1Database, userId: string, id: string): Promise<boolean> {
  const res = await db.prepare("DELETE FROM compass_items WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return (res.meta?.changes ?? 0) === 1;
}

export async function deleteCompass(db: D1Database, userId: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM compass_items WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM compass_changes WHERE user_id = ?").bind(userId),
  ]);
}

/** SAY IT YOUR WAY confirm: the person's words replace the line's text, on the line they picked. */
export async function updateCompassLine(
  db: D1Database, userId: string, id: string, part: CompassLine["part"], text: string, origin: CompassOrigin,
): Promise<boolean> {
  const res = await db
    .prepare("UPDATE compass_items SET part = ?, text = ?, origin = ? WHERE id = ? AND user_id = ?")
    .bind(part, text, origin, id, userId)
    .run();
  return (res.meta?.changes ?? 0) === 1;
}

export async function getCompassLine(db: D1Database, userId: string, id: string): Promise<CompassItemRow | null> {
  return await db.prepare("SELECT * FROM compass_items WHERE id = ? AND user_id = ?").bind(id, userId).first<CompassItemRow>();
}

/** A REVIEW tap marks where the line was checked: Around (delivery/suggest) or a try debrief (feedback). */
export async function setCompassOrigin(db: D1Database, userId: string, id: string, origin: CompassOrigin): Promise<boolean> {
  const res = await db.prepare("UPDATE compass_items SET origin = ? WHERE id = ? AND user_id = ?").bind(origin, id, userId).run();
  return (res.meta?.changes ?? 0) === 1;
}

/** Every SAY IT YOUR WAY confirm and REMOVE is recorded before it lands, for UNDO. */
export async function recordChange(
  db: D1Database, userId: string, kind: "line" | "remove", lineId: string | null,
  before: string | null, after: string | null, words: string, feedbackRef: string | null, nowIso: string,
): Promise<string> {
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO compass_changes (id, user_id, kind, line_id, before, after, words, feedback_ref, proposed_at, confirmed_at, undone_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)")
    .bind(id, userId, kind, lineId, before, after, words, feedbackRef, nowIso, nowIso)
    .run();
  return id;
}

export async function latestUndoable(db: D1Database, userId: string): Promise<import("../types").CompassChangeRow | null> {
  return await db
    .prepare("SELECT * FROM compass_changes WHERE user_id = ? AND confirmed_at IS NOT NULL AND undone_at IS NULL ORDER BY confirmed_at DESC, rowid DESC LIMIT 1")
    .bind(userId)
    .first<import("../types").CompassChangeRow>();
}

export async function recentChanges(db: D1Database, userId: string, limit: number): Promise<import("../types").CompassChangeRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM compass_changes WHERE user_id = ? AND confirmed_at IS NOT NULL ORDER BY confirmed_at DESC, rowid DESC LIMIT ?")
    .bind(userId, limit)
    .all<import("../types").CompassChangeRow>();
  return results;
}

export async function markUndone(db: D1Database, userId: string, id: string, nowIso: string): Promise<void> {
  await db.prepare("UPDATE compass_changes SET undone_at = ? WHERE id = ? AND user_id = ?").bind(nowIso, id, userId).run();
}

/** UNDO of a REMOVE brings the line back with its direction and source. */
export async function restoreCompassLine(
  db: D1Database, userId: string, id: string, part: CompassLine["part"], text: string, sourceUrl: string | null, origin: CompassOrigin, nowIso: string,
): Promise<void> {
  await db
    .prepare("INSERT OR REPLACE INTO compass_items (id, user_id, part, text, source_url, origin, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
    .bind(id, userId, part, text, sourceUrl, origin, nowIso)
    .run();
}

/** The texts FITS YOU compares against: what they're into and like talking about, never filters. */
export async function compassTexts(db: D1Database, userId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT text FROM compass_items WHERE user_id = ? AND active = 1 AND part != 'filter'")
    .bind(userId)
    .all<{ text: string }>();
  return results.map((r) => r.text);
}
