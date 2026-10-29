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
  libraryId: string;
  placeKind: string;
  outcome: string;
  createdAt: string;
}

export async function recordTry(db: D1Database, t: NewTry): Promise<void> {
  await db
    .prepare("INSERT INTO tries (id, user_id, step, source, library_id, place_kind, outcome, created_at) VALUES (?, ?, ?, 'library', ?, ?, ?, ?)")
    .bind(t.id, t.userId, t.step, t.libraryId, t.placeKind, t.outcome, t.createdAt)
    .run();
}

export async function tryCounts(db: D1Database, userId: string): Promise<{ tries: number; leaves: number }> {
  const row = await db
    .prepare("SELECT COUNT(*) AS tries, SUM(CASE WHEN outcome != 'didnt_happen' THEN 1 ELSE 0 END) AS leaves FROM tries WHERE user_id = ?")
    .bind(userId)
    .first<{ tries: number; leaves: number | null }>();
  return { tries: row?.tries ?? 0, leaves: row?.leaves ?? 0 };
}
