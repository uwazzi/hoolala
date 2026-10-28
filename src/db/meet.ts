// WP5 and WP6: meet exchanges, interactions, moments, staying in touch, and
// the collective numbers for the Live page. The only place their SQL lives.

import type { D1Database, MeetExchangeRow } from "../types";

export async function insertExchange(
  db: D1Database,
  e: { id: string; initiatorId: string; tokenHash: string; expiresAt: string; signalId: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO meet_exchanges (id, initiator_id, token_hash, expires_at, signal_id) VALUES (?, ?, ?, ?, ?)")
    .bind(e.id, e.initiatorId, e.tokenHash, e.expiresAt, e.signalId)
    .run();
}

export async function getExchange(db: D1Database, id: string): Promise<MeetExchangeRow | null> {
  return db.prepare("SELECT * FROM meet_exchanges WHERE id = ?").bind(id).first<MeetExchangeRow>();
}

export async function getExchangeByHash(db: D1Database, tokenHash: string): Promise<MeetExchangeRow | null> {
  return db.prepare("SELECT * FROM meet_exchanges WHERE token_hash = ?").bind(tokenHash).first<MeetExchangeRow>();
}

/** Takes the joiner seat once; a second person can't take it over. */
export async function setJoiner(db: D1Database, id: string, joinerId: string): Promise<boolean> {
  const res = await db
    .prepare("UPDATE meet_exchanges SET joiner_id = ? WHERE id = ? AND (joiner_id IS NULL OR joiner_id = ?)")
    .bind(joinerId, id, joinerId)
    .run();
  return (res.meta?.changes ?? 0) === 1;
}

export async function agree(db: D1Database, ex: MeetExchangeRow, userId: string, nowIso: string): Promise<void> {
  const column = userId === ex.initiator_id ? "initiator_agreed_at" : "joiner_agreed_at";
  await db.prepare(`UPDATE meet_exchanges SET ${column} = COALESCE(${column}, ?) WHERE id = ?`).bind(nowIso, ex.id).run();
}

/**
 * Both agreed: one interaction per pair per day (the Live number), and a
 * private moment for each, written only when the interaction is new.
 */
export async function confirmMeet(
  db: D1Database,
  m: { interactionId: string; userA: string; userB: string; placeId: string | null; signalId: string; day: string; nowIso: string },
): Promise<void> {
  const res = await db
    .prepare(
      `INSERT OR IGNORE INTO interactions (id, kind, user_a, user_b, place_id, signal_id, day, confirmed_at)
       VALUES (?, 'here', ?, ?, ?, ?, ?, ?)`,
    )
    .bind(m.interactionId, m.userA, m.userB, m.placeId, m.signalId, m.day, m.nowIso)
    .run();
  if ((res.meta?.changes ?? 0) !== 1) return;
  await db.batch(
    [m.userA, m.userB].map((userId) =>
      db
        .prepare("INSERT INTO moments (id, user_id, interaction_id, label) VALUES (?, ?, ?, ?)")
        .bind(crypto.randomUUID(), userId, m.interactionId, "You met an actual human."),
    ),
  );
}

/** STAY IN TOUCH: a friendship only when both chose it. Returns nothing either way. */
export async function chooseStayInTouch(
  db: D1Database,
  s: { userId: string; otherId: string; signalId: string; userA: string; userB: string; nowIso: string },
): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO stay_in_touch (user_id, other_id, signal_id, chosen_at) VALUES (?, ?, ?, ?)")
    .bind(s.userId, s.otherId, s.signalId, s.nowIso)
    .run();
  await db
    .prepare(
      `INSERT OR IGNORE INTO friendships (user_a, user_b, created_at, status)
       SELECT ?, ?, ?, 'active' WHERE EXISTS (
         SELECT 1 FROM stay_in_touch WHERE user_id = ? AND other_id = ? AND signal_id = ?)`,
    )
    .bind(s.userA, s.userB, s.nowIso, s.otherId, s.userId, s.signalId)
    .run();
}

export async function firstName(db: D1Database, userId: string): Promise<string | null> {
  return db.prepare("SELECT first_name FROM users WHERE id = ?").bind(userId).first<string>("first_name");
}

// --- Live page (WP6): collective counts only ---------------------------------

export interface LiveCounts {
  hellos: number;
  acceptedSignals: number;
  metSignals: number;
  checkinAttempts: number;
  checkinOk: number;
  factsConfirmedWeek: number;
  places: { name: string; hellos: number }[];
}

export async function liveCounts(db: D1Database, sinceIso: string, weekAgoIso: string): Promise<LiveCounts> {
  const one = async (sql: string, ...binds: unknown[]) =>
    ((await db.prepare(sql).bind(...binds).first<number>("n")) as number | null) ?? 0;
  const [hellos, acceptedSignals, metSignals, checkinAttempts, checkinOk, factsConfirmedWeek] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM interactions WHERE kind = 'here' AND confirmed_at >= ?", sinceIso),
    one("SELECT COUNT(DISTINCT signal_id) AS n FROM signal_responses WHERE state = 'accepted' AND created_at >= ?", sinceIso),
    one("SELECT COUNT(DISTINCT signal_id) AS n FROM interactions WHERE kind = 'here' AND signal_id IS NOT NULL AND confirmed_at >= ?", sinceIso),
    one("SELECT COUNT(*) AS n FROM checkin_attempts WHERE created_at >= ?", sinceIso),
    one("SELECT COUNT(*) AS n FROM checkin_attempts WHERE ok = 1 AND created_at >= ?", sinceIso),
    one("SELECT COUNT(*) AS n FROM place_facts WHERE state = 'confirmed' AND updated_at >= ?", weekAgoIso),
  ]);
  // Places by name, not ranked: no leaderboards.
  const { results } = await db
    .prepare(
      `SELECT p.name AS name, COUNT(*) AS hellos FROM interactions i JOIN places p ON p.id = i.place_id
       WHERE i.kind = 'here' AND i.confirmed_at >= ? AND p.status != 'hidden'
       GROUP BY p.id ORDER BY p.name LIMIT 20`,
    )
    .bind(sinceIso)
    .all<{ name: string; hellos: number }>();
  return { hellos, acceptedSignals, metSignals, checkinAttempts, checkinOk, factsConfirmedWeek, places: results };
}
