// WP28: tiny-try storage. The step is code-assigned from the person's current
// step; leaves are counted from outcomes, never stored.

import type { D1Database } from "../types";

export async function userStep(db: D1Database, userId: string): Promise<number> {
  const row = await db.prepare("SELECT current_step AS step FROM users WHERE id = ?").bind(userId).first<{ step: number }>();
  return row?.step ?? 1;
}

export async function setUserStep(db: D1Database, userId: string, step: number): Promise<void> {
  await db.prepare("UPDATE users SET current_step = ? WHERE id = ?").bind(step, userId).run();
}

export interface NewTry {
  id: string;
  userId: string;
  step: number;
  source: "library" | "try_it";
  libraryId: string | null;
  placeKind: string;
  outcome: string;
  title: string | null;
  hint: string | null;
  why: string | null;
  createdAt: string;
}

export async function recordTry(db: D1Database, t: NewTry): Promise<void> {
  await db
    .prepare("INSERT INTO tries (id, user_id, step, source, library_id, place_kind, outcome, title, hint, why, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(t.id, t.userId, t.step, t.source, t.libraryId, t.placeKind, t.outcome, t.title, t.hint, t.why, t.createdAt)
    .run();
}

export async function lastOutcomes(db: D1Database, userId: string, limit: number): Promise<string[]> {
  const res = await db.prepare("SELECT outcome FROM tries WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").bind(userId, limit).all<{ outcome: string }>();
  return res.results.map((r) => r.outcome);
}

export interface TryRow {
  id: string;
  user_id: string;
  step: number;
  source: string;
  library_id: string | null;
  place_kind: string;
  outcome: string;
  title: string | null;
  hint: string | null;
  why: string | null;
  created_at: string;
}

/** One recorded try, owner only. Powers the COMPASS? fix-up from a debrief. */
export async function getTry(db: D1Database, userId: string, id: string): Promise<TryRow | null> {
  return await db.prepare("SELECT * FROM tries WHERE id = ? AND user_id = ?").bind(id, userId).first<TryRow>();
}

export async function tryCounts(db: D1Database, userId: string): Promise<{ tries: number; leaves: number }> {
  const row = await db
    .prepare("SELECT COUNT(*) AS tries, SUM(CASE WHEN outcome != 'didnt_happen' THEN 1 ELSE 0 END) AS leaves FROM tries WHERE user_id = ?")
    .bind(userId)
    .first<{ tries: number; leaves: number | null }>();
  return { tries: row?.tries ?? 0, leaves: row?.leaves ?? 0 };
}
