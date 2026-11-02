// WP-A1: icebreaker rooms, members and replies. The only place their SQL
// lives. Visibility is decided in src/rules/rooms.ts; these queries only
// fetch candidates. Only the snapped grid cell is stored, never raw
// coordinates.

import type { D1Database, RoomMemberRow, RoomReplyCode, RoomRole, RoomRow, RoomStatus } from "../types";

export interface NewRoom {
  id: string;
  starterId: string;
  topic: string;
  placeText: string;
  cellLat: number;
  cellLng: number;
  lang: string | null;
  translation: string | null;
  opensAt: string;
  endsAt: string;
  status: RoomStatus;
  createdAt: string;
}

export async function createRoom(db: D1Database, room: NewRoom): Promise<void> {
  await db
    .prepare(
      `INSERT INTO rooms (id, starter_id, topic, place_text, cell_lat, cell_lng, lang, translation,
        opens_at, ends_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      room.id,
      room.starterId,
      room.topic,
      room.placeText,
      room.cellLat,
      room.cellLng,
      room.lang,
      room.translation,
      room.opensAt,
      room.endsAt,
      room.status,
      room.createdAt,
    )
    .run();
}

export async function getRoom(db: D1Database, id: string): Promise<RoomRow | null> {
  return db.prepare("SELECT * FROM rooms WHERE id = ?").bind(id).first<RoomRow>();
}

/** Open rooms whose cell is within reach of this cell (callers check the exact 500 m). */
export async function candidateRooms(db: D1Database, cellLat: number, cellLng: number, nowIso: string): Promise<RoomRow[]> {
  // A generous box: 500 m plus the 200 m cell diagonal, in degrees.
  const box = 1000 / 111320;
  const { results } = await db
    .prepare(
      `SELECT * FROM rooms
       WHERE status = 'open' AND ends_at > ?
         AND cell_lat BETWEEN ? AND ? AND cell_lng BETWEEN ? AND ?
       ORDER BY created_at ASC LIMIT 50`,
    )
    .bind(nowIso, cellLat - box, cellLat + box, cellLng - box, cellLng + box)
    .all<RoomRow>();
  return results;
}

export async function openRoomsByStarter(db: D1Database, starterId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM rooms WHERE starter_id = ? AND status = 'open'")
    .bind(starterId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function startsToday(db: D1Database, starterId: string, day: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM rooms WHERE starter_id = ? AND substr(created_at, 1, 10) = ?")
    .bind(starterId, day)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function setRoomStatus(db: D1Database, id: string, status: RoomStatus): Promise<void> {
  await db.prepare("UPDATE rooms SET status = ? WHERE id = ?").bind(status, id).run();
}

export interface NewMember {
  roomId: string;
  userId: string;
  role: RoomRole;
  line?: string;
  joinedAt: string;
}

export async function addMember(db: D1Database, member: NewMember): Promise<void> {
  await db
    .prepare("INSERT INTO room_members (room_id, user_id, role, line, joined_at) VALUES (?, ?, ?, ?, ?)")
    .bind(member.roomId, member.userId, member.role, member.line ?? null, member.joinedAt)
    .run();
}

export async function getMembership(db: D1Database, roomId: string, userId: string): Promise<RoomMemberRow | null> {
  return db.prepare("SELECT * FROM room_members WHERE room_id = ? AND user_id = ?").bind(roomId, userId).first<RoomMemberRow>();
}

/** Current members: joined, not left, not removed. */
export async function currentMemberIds(db: D1Database, roomId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT user_id AS id FROM room_members WHERE room_id = ? AND left_at IS NULL AND removed = 0 ORDER BY joined_at ASC")
    .bind(roomId)
    .all<{ id: string }>();
  return results.map((r) => r.id);
}

export async function removedIds(db: D1Database, roomId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT user_id AS id FROM room_members WHERE room_id = ? AND removed = 1")
    .bind(roomId)
    .all<{ id: string }>();
  return results.map((r) => r.id);
}

/** The starter removes someone: they leave the room and never see it again. */
export async function markRemoved(db: D1Database, roomId: string, userId: string): Promise<boolean> {
  const res = await db
    .prepare("UPDATE room_members SET removed = 1 WHERE room_id = ? AND user_id = ? AND removed = 0")
    .bind(roomId, userId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

/** Leaving is always allowed, no reason asked, nobody told why. */
export async function markLeft(db: D1Database, roomId: string, userId: string): Promise<void> {
  await db.prepare("UPDATE room_members SET left_at = ? WHERE room_id = ? AND user_id = ?").bind(new Date().toISOString(), roomId, userId).run();
}

export async function rejoined(db: D1Database, roomId: string, userId: string, joinedAt: string): Promise<void> {
  await db.prepare("UPDATE room_members SET left_at = NULL, joined_at = ? WHERE room_id = ? AND user_id = ?").bind(joinedAt, roomId, userId).run();
}

/** Rooms this person currently belongs to (any role). */
export async function currentRoomsFor(db: D1Database, userId: string): Promise<RoomMemberRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM room_members WHERE user_id = ? AND left_at IS NULL AND removed = 0")
    .bind(userId)
    .all<RoomMemberRow>();
  return results;
}

export async function joinsLastHour(db: D1Database, userId: string, sinceIso: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM room_members WHERE user_id = ? AND role = 'member' AND joined_at > ?")
    .bind(userId, sinceIso)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function memberNames(db: D1Database, roomId: string): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT u.first_name AS name FROM room_members m JOIN users u ON u.id = m.user_id
       WHERE m.room_id = ? AND m.left_at IS NULL AND m.removed = 0 AND u.first_name IS NOT NULL
       ORDER BY m.joined_at ASC`,
    )
    .bind(roomId)
    .all<{ name: string }>();
  return results.map((r) => r.name);
}

export async function addReply(
  db: D1Database,
  reply: { id: string; roomId: string; userId: string; code: RoomReplyCode; createdAt: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO room_replies (id, room_id, user_id, code, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(reply.id, reply.roomId, reply.userId, reply.code, reply.createdAt)
    .run();
}

/** The cron closes open rooms past ends_at. Returns how many closed. */
export async function closeExpiredRooms(db: D1Database, nowIso: string): Promise<number> {
  const res = await db.prepare("UPDATE rooms SET status = 'expired' WHERE status = 'open' AND ends_at <= ?").bind(nowIso).run();
  return res.meta?.changes ?? 0;
}

/**
 * The cron deletes rooms ended more than 24 h ago. Members, replies and the
 * grid cell go with the room (cascades); only interactions survive.
 */
export async function purgeRooms(db: D1Database, cutoffIso: string): Promise<void> {
  await db.prepare("DELETE FROM rooms WHERE ends_at < ?").bind(cutoffIso).run();
}
