// WP2: users, sessions and login tokens. The only place auth SQL lives.

import type { D1Database, SessionRow, UserRow } from "../types";

export async function insertLoginToken(
  db: D1Database,
  tokenHash: string,
  email: string,
  expiresAt: string,
): Promise<void> {
  await db
    .prepare("INSERT INTO login_tokens (token_hash, email, expires_at, used_at) VALUES (?, ?, ?, NULL)")
    .bind(tokenHash, email, expiresAt)
    .run();
}

/**
 * Marks a token used in one statement, so two clicks can't both win.
 * Returns the email for a fresh, unused token; null otherwise.
 */
export async function consumeLoginToken(
  db: D1Database,
  tokenHash: string,
  nowIso: string,
): Promise<string | null> {
  const res = await db
    .prepare(
      "UPDATE login_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?",
    )
    .bind(nowIso, tokenHash, nowIso)
    .run();
  if ((res.meta?.changes ?? 0) !== 1) return null;
  return db.prepare("SELECT email FROM login_tokens WHERE token_hash = ?").bind(tokenHash).first<string>("email");
}

export async function findUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db
    .prepare("SELECT * FROM users WHERE email = ? AND deleted_at IS NULL")
    .bind(email)
    .first<UserRow>();
}

export async function getUser(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare("SELECT * FROM users WHERE id = ? AND deleted_at IS NULL").bind(id).first<UserRow>();
}

/** Email sign-in always confirmed 18+ before the link was sent. */
export async function createEmailUser(
  db: D1Database,
  id: string,
  email: string,
  nowIso: string,
): Promise<UserRow> {
  await db
    .prepare("INSERT INTO users (id, email, is_adult, created_at) VALUES (?, ?, 1, ?)")
    .bind(id, email, nowIso)
    .run();
  return {
    id,
    email,
    telegram_user_id: null,
    first_name: null,
    is_adult: 1,
    created_at: nowIso,
    deleted_at: null,
    current_step: 1,
  };
}

export async function setFirstName(db: D1Database, userId: string, firstName: string): Promise<void> {
  await db.prepare("UPDATE users SET first_name = ? WHERE id = ?").bind(firstName, userId).run();
}

export async function insertSession(db: D1Database, session: SessionRow): Promise<void> {
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(session.id, session.user_id, session.expires_at)
    .run();
}

export async function findSession(db: D1Database, id: string): Promise<SessionRow | null> {
  return db.prepare("SELECT * FROM sessions WHERE id = ?").bind(id).first<SessionRow>();
}

export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
}

export async function sessionIdsForUser(db: D1Database, userId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT id FROM sessions WHERE user_id = ?")
    .bind(userId)
    .all<{ id: string }>();
  return results.map((r) => r.id);
}

/**
 * Delete account: removes everything personal in one transaction and keeps
 * anonymous counts. `interactions` rows stay (the Live number) with their
 * signal link cleared; the users row stays as an empty tombstone so those
 * counts keep a valid id. Place facts and places the person added stay,
 * without their name on them.
 */
export async function deleteAccount(db: D1Database, userId: string, email: string | null, nowIso: string): Promise<void> {
  const own = "SELECT id FROM signals WHERE owner_id = ?1";
  const statements = [
    `DELETE FROM quick_replies WHERE user_id = ?1 OR signal_id IN (${own})`,
    `DELETE FROM meeting_points WHERE signal_id IN (${own})`,
    `DELETE FROM signal_responses WHERE responder_id = ?1 OR signal_id IN (${own})`,
    `DELETE FROM stay_in_touch WHERE user_id = ?1 OR other_id = ?1 OR signal_id IN (${own})`,
    `DELETE FROM meet_exchanges WHERE initiator_id = ?1 OR joiner_id = ?1 OR signal_id IN (${own})`,
    "DELETE FROM reports WHERE reporter_id = ?1",
    `UPDATE reports SET signal_id = NULL WHERE signal_id IN (${own})`,
    `UPDATE interactions SET signal_id = NULL WHERE signal_id IN (${own})`,
    "DELETE FROM moments WHERE user_id = ?1",
    "DELETE FROM tries WHERE user_id = ?1",
    "DELETE FROM crew_nice WHERE user_id = ?1",
    "DELETE FROM crew_nice WHERE post_id IN (SELECT id FROM crew_posts WHERE user_id = ?1)",
    "DELETE FROM crew_posts WHERE user_id = ?1",
    "DELETE FROM crew_members WHERE user_id = ?1",
    "DELETE FROM signals WHERE owner_id = ?1",
    "DELETE FROM friendships WHERE user_a = ?1 OR user_b = ?1",
    "DELETE FROM blocks WHERE blocker_id = ?1 OR blocked_id = ?1",
    "DELETE FROM checkins WHERE user_id = ?1",
    "DELETE FROM compass_items WHERE user_id = ?1",
    "DELETE FROM compass_changes WHERE user_id = ?1",
    "DELETE FROM place_contributions WHERE user_id = ?1",
    "DELETE FROM workings WHERE user_id = ?1",
    "UPDATE place_facts SET added_by = NULL WHERE added_by = ?1",
    "UPDATE places SET added_by = NULL WHERE added_by = ?1",
    "DELETE FROM sessions WHERE user_id = ?1",
  ].map((sql) => db.prepare(sql).bind(userId));
  if (email) {
    statements.push(db.prepare("DELETE FROM login_tokens WHERE email = ?").bind(email));
  }
  for (const sql of [
    "DELETE FROM crews WHERE id NOT IN (SELECT crew_id FROM crew_members)",
    "DELETE FROM crew_invites WHERE crew_id NOT IN (SELECT id FROM crews)",
    "DELETE FROM crew_posts WHERE crew_id NOT IN (SELECT id FROM crews)",
    "DELETE FROM crew_nice WHERE post_id NOT IN (SELECT id FROM crew_posts)",
  ]) {
    statements.push(db.prepare(sql));
  }
  statements.push(
    db
      .prepare(
        "UPDATE users SET email = NULL, telegram_user_id = NULL, first_name = NULL, current_step = 1, deleted_at = ? WHERE id = ?",
      )
      .bind(nowIso, userId),
  );
  await db.batch(statements);
}
