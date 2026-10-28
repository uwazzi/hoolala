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

/** LOOKS RIGHT: the confirmed lines replace whatever was there. */
export async function replaceCompass(db: D1Database, userId: string, lines: CompassLine[], origin: CompassOrigin, nowIso: string): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM compass_items WHERE user_id = ?").bind(userId),
    ...lines.map((l) =>
      db
        .prepare("INSERT INTO compass_items (id, user_id, part, text, source_url, origin, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
        .bind(crypto.randomUUID(), userId, l.part, l.text, l.sourceUrl, origin, nowIso),
    ),
  ]);
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

/** The texts FITS YOU compares against: what they're into and like talking about, never filters. */
export async function compassTexts(db: D1Database, userId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT text FROM compass_items WHERE user_id = ? AND active = 1 AND part != 'filter'")
    .bind(userId)
    .all<{ text: string }>();
  return results.map((r) => r.text);
}
