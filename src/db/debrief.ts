// WP-A5: debriefs, owner feedback and stay-in-touch choices. Debriefs stay
// private to the person; the owner only ever sees aggregates with at least
// 5 answers per bucket, never per person.

import type { D1Database, DebriefChat, DebriefRow, FeedbackTag } from "../types";

export interface MetPerson {
  userId: string;
  name: string;
  stayToken: string | null;
}

/**
 * People this person met at this table: sat at it and share a recorded
 * table meeting. A sitter nobody scanned meets nobody.
 */
export async function metAtTable(db: D1Database, roomId: string, userId: string): Promise<MetPerson[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT m.user_id AS userId, u.first_name AS name, m.remove_token AS stayToken
       FROM room_members m JOIN users u ON u.id = m.user_id
       WHERE m.room_id = ? AND m.user_id != ? AND m.at_table_at IS NOT NULL AND m.removed = 0
         AND u.first_name IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM interactions i WHERE i.kind = 'table'
             AND ((i.user_a = ? AND i.user_b = m.user_id) OR (i.user_b = ? AND i.user_a = m.user_id)))
       ORDER BY u.first_name ASC, m.user_id ASC`,
    )
    .bind(roomId, userId, userId, userId)
    .all<MetPerson>();
  return results;
}

export async function getDebrief(db: D1Database, roomId: string, userId: string): Promise<DebriefRow | null> {
  return db.prepare("SELECT * FROM debriefs WHERE room_id = ? AND user_id = ?").bind(roomId, userId).first<DebriefRow>();
}

export async function insertDebrief(
  db: D1Database,
  row: { roomId: string; userId: string; battery: number | null; chat: DebriefChat | null; createdAt: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO debriefs (user_id, room_id, battery, chat, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(row.userId, row.roomId, row.battery, row.chat, row.createdAt)
    .run();
}

export async function insertOwnerFeedback(
  db: D1Database,
  row: { id: string; tag: FeedbackTag | null; text: string; createdAt: string; appVersion: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO owner_feedback (id, tag, text, created_at, app_version) VALUES (?, ?, ?, ?, ?)")
    .bind(row.id, row.tag, row.text, row.createdAt, row.appVersion)
    .run();
}

export async function stayChoice(db: D1Database, roomId: string, userId: string, otherId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS yes FROM stay_room WHERE room_id = ? AND user_id = ? AND other_id = ?")
    .bind(roomId, userId, otherId)
    .first<{ yes: number }>();
  return row !== null;
}

export async function chooseStay(db: D1Database, roomId: string, userId: string, otherId: string, nowIso: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO stay_room (user_id, other_id, room_id, chosen_at) VALUES (?, ?, ?, ?)")
    .bind(userId, otherId, roomId, nowIso)
    .run();
  const [a, b] = userId < otherId ? [userId, otherId] : [otherId, userId];
  await db
    .prepare(
      `INSERT OR IGNORE INTO friendships (user_a, user_b, created_at, status)
       SELECT ?, ?, ?, 'active' WHERE EXISTS (
         SELECT 1 FROM stay_room WHERE user_id = ? AND other_id = ? AND room_id = ?)`,
    )
    .bind(a, b, nowIso, otherId, userId, roomId)
    .run();
}

/** Rooms with a debrief waiting: met someone, left the table or the room ended, unanswered, fresh. */
export async function pendingDebriefs(db: D1Database, userId: string, nowIso: string): Promise<{ id: string; topic: string; endsAt: string }[]> {
  const { results } = await db
    .prepare(
      `SELECT r.id AS id, r.topic AS topic, r.ends_at AS endsAt
       FROM rooms r JOIN room_members m ON m.room_id = r.id
       WHERE m.user_id = ? AND m.at_table_at IS NOT NULL AND m.removed = 0
         AND (m.table_left_at IS NOT NULL OR r.status != 'open' OR r.ends_at <= ?)
         AND r.ends_at > datetime(?, '-1 day')
         AND NOT EXISTS (SELECT 1 FROM debriefs d WHERE d.room_id = r.id AND d.user_id = ?)
       ORDER BY r.ends_at ASC LIMIT 5`,
    )
    .bind(userId, nowIso, nowIso, userId)
    .all<{ id: string; topic: string; endsAt: string }>();
  const due: { id: string; topic: string; endsAt: string }[] = [];
  for (const room of results) {
    if ((await metAtTable(db, room.id, userId)).length > 0) due.push(room);
  }
  return due;
}

export type BucketCounts = Record<string, number | null>;

/**
 * Owner aggregates: counts per value per day. Buckets with fewer than 5
 * answers stay null, so no answer ever singles anyone out.
 */
export async function debriefAggregates(db: D1Database, day: string): Promise<{ battery: BucketCounts; chat: BucketCounts }> {
  const tally = async (column: string, keys: string[]) => {
    const { results } = await db
      .prepare(`SELECT ${column} AS k, COUNT(*) AS n FROM debriefs WHERE substr(created_at, 1, 10) = ? AND ${column} IS NOT NULL GROUP BY ${column}`)
      .bind(day)
      .all<{ k: string; n: number }>();
    const counts: BucketCounts = {};
    for (const key of keys) counts[key] = null;
    for (const row of results) counts[String(row.k)] = row.n >= 5 ? row.n : null;
    return counts;
  };
  return {
    battery: await tally("battery", ["1", "2", "3", "4", "5"]),
    chat: await tally("chat", ["awkward", "ok", "good", "great"]),
  };
}

/** Owner feedback older than 90 days goes, cron-deleted. */
export async function purgeOwnerFeedback(db: D1Database, cutoffIso: string): Promise<void> {
  await db.prepare("DELETE FROM owner_feedback WHERE created_at < ?").bind(cutoffIso).run();
}
