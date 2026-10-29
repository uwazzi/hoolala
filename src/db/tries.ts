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
  source: "library" | "try_it" | "game";
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

export interface GameTryRow {
  id: string;
  user_id: string;
  game_id: string;
  level: string;
  step: number;
  kind: string;
  who_role: string | null;
  title: string;
  source: string;
  created_at: string;
  picked_at: string | null;
}

export interface NewGameTry {
  id: string;
  userId: string;
  gameId: string;
  level: string;
  step: number;
  kind: string;
  whoRole: string | null;
  title: string;
  source: "ai" | "library";
  createdAt: string;
}

export async function saveGameTries(db: D1Database, rows: NewGameTry[]): Promise<void> {
  await db.batch(
    rows.map((t) =>
      db
        .prepare("INSERT INTO game_tries (id, user_id, game_id, level, step, kind, who_role, title, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(t.id, t.userId, t.gameId, t.level, t.step, t.kind, t.whoRole, t.title, t.source, t.createdAt),
    ),
  );
}

export async function gameBelongs(db: D1Database, userId: string, gameId: string): Promise<boolean> {
  const row = await db.prepare("SELECT 1 AS ok FROM game_tries WHERE user_id = ? AND game_id = ? LIMIT 1").bind(userId, gameId).first<{ ok: number }>();
  return row !== null;
}

/** Picking stores today's try. Owner only; null when the try isn't theirs. */
export async function pickGameTry(db: D1Database, userId: string, id: string, pickedAt: string): Promise<GameTryRow | null> {
  await db.prepare("UPDATE game_tries SET picked_at = ? WHERE id = ? AND user_id = ?").bind(pickedAt, id, userId).run();
  return await db.prepare("SELECT * FROM game_tries WHERE id = ? AND user_id = ?").bind(id, userId).first<GameTryRow>();
}

export async function setCurrentGameTry(db: D1Database, userId: string, id: string): Promise<void> {
  await db.prepare("UPDATE users SET current_game_try_id = ? WHERE id = ?").bind(id, userId).run();
}

export async function latestPickedGameTry(db: D1Database, userId: string): Promise<GameTryRow | null> {
  return await db
    .prepare("SELECT g.* FROM game_tries g JOIN users u ON u.id = g.user_id WHERE g.user_id = ? AND g.id = u.current_game_try_id")
    .bind(userId)
    .first<GameTryRow>();
}

export async function purgeOldGames(db: D1Database, beforeIso: string): Promise<void> {
  await db.prepare("DELETE FROM game_tries WHERE created_at < ?").bind(beforeIso).run();
}

export async function getGameTry(db: D1Database, userId: string, id: string): Promise<GameTryRow | null> {
  return await db.prepare("SELECT * FROM game_tries WHERE id = ? AND user_id = ?").bind(id, userId).first<GameTryRow>();
}

/** ANOTHER ONE: the next unpicked try at this level of this game. */
export async function nextUnpickedGameTry(db: D1Database, userId: string, gameId: string, level: string, currentId: string): Promise<GameTryRow | null> {
  return await db
    .prepare("SELECT * FROM game_tries WHERE user_id = ? AND game_id = ? AND level = ? AND picked_at IS NULL AND id != ? ORDER BY rowid LIMIT 1")
    .bind(userId, gameId, level, currentId)
    .first<GameTryRow>();
}
