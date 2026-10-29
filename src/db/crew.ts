// WP30: crew storage. One crew per person; invite links carry the join; a
// member's stories leave with them; an empty crew is closed at once.

import type { CrewInviteRow, CrewPostRow, CrewRow, D1Database } from "../types";

export async function myCrewId(db: D1Database, userId: string): Promise<string | null> {
  const row = await db.prepare("SELECT crew_id AS id FROM crew_members WHERE user_id = ?").bind(userId).first<{ id: string }>();
  return row?.id ?? null;
}

export async function getCrew(db: D1Database, crewId: string): Promise<CrewRow | null> {
  return db.prepare("SELECT * FROM crews WHERE id = ?").bind(crewId).first<CrewRow>();
}

export async function createCrew(db: D1Database, crew: { id: string; name: string; sharedLibraryId: string; createdBy: string; createdAt: string }): Promise<void> {
  await db
    .prepare("INSERT INTO crews (id, name, shared_library_id, created_by, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crew.id, crew.name, crew.sharedLibraryId, crew.createdBy, crew.createdAt)
    .run();
}

export async function addMember(db: D1Database, crewId: string, userId: string, joinedAt: string): Promise<void> {
  await db.prepare("INSERT INTO crew_members (crew_id, user_id, joined_at) VALUES (?, ?, ?)").bind(crewId, userId, joinedAt).run();
}

/** Membership, their posts and every NICE ONE to or from them go together. */
export async function removeMember(db: D1Database, crewId: string, userId: string): Promise<void> {
  await db.prepare("DELETE FROM crew_nice WHERE post_id IN (SELECT id FROM crew_posts WHERE crew_id = ? AND user_id = ?)").bind(crewId, userId).run();
  await db.prepare("DELETE FROM crew_nice WHERE user_id = ?").bind(userId).run();
  await db.prepare("DELETE FROM crew_posts WHERE crew_id = ? AND user_id = ?").bind(crewId, userId).run();
  await db.prepare("DELETE FROM crew_members WHERE crew_id = ? AND user_id = ?").bind(crewId, userId).run();
}

export async function members(db: D1Database, crewId: string): Promise<{ user_id: string; name: string }[]> {
  const res = await db
    .prepare("SELECT m.user_id AS user_id, COALESCE(u.first_name, 'Someone') AS name FROM crew_members m LEFT JOIN users u ON u.id = m.user_id WHERE m.crew_id = ? ORDER BY m.joined_at")
    .bind(crewId)
    .all<{ user_id: string; name: string }>();
  return res.results;
}

export async function setInvite(db: D1Database, invite: { tokenHash: string; crewId: string; createdBy: string; createdAt: string; expiresAt: string }): Promise<void> {
  await db.prepare("DELETE FROM crew_invites WHERE crew_id = ?").bind(invite.crewId).run();
  await db
    .prepare("INSERT INTO crew_invites (token_hash, crew_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(invite.tokenHash, invite.crewId, invite.createdBy, invite.createdAt, invite.expiresAt)
    .run();
}

export async function getInvite(db: D1Database, tokenHash: string): Promise<CrewInviteRow | null> {
  return db.prepare("SELECT * FROM crew_invites WHERE token_hash = ?").bind(tokenHash).first<CrewInviteRow>();
}

export async function getPost(db: D1Database, postId: string): Promise<CrewPostRow | null> {
  return db.prepare("SELECT * FROM crew_posts WHERE id = ?").bind(postId).first<CrewPostRow>();
}

export async function addPost(db: D1Database, post: { id: string; crewId: string; userId: string; outcome: string; text: string; verdict: string; createdAt: string }): Promise<void> {
  await db
    .prepare("INSERT INTO crew_posts (id, crew_id, user_id, outcome, text, screening_verdict, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(post.id, post.crewId, post.userId, post.outcome, post.text, post.verdict, post.createdAt)
    .run();
}

export async function crewPosts(db: D1Database, crewId: string, limit: number): Promise<(CrewPostRow & { name: string })[]> {
  const res = await db
    .prepare(
      "SELECT p.*, COALESCE(u.first_name, 'Someone') AS name FROM crew_posts p LEFT JOIN users u ON u.id = p.user_id WHERE p.crew_id = ? ORDER BY p.created_at DESC LIMIT ?",
    )
    .bind(crewId, limit)
    .all<CrewPostRow & { name: string }>();
  return res.results;
}

export async function niceFor(db: D1Database, postIds: string[]): Promise<{ post_id: string; user_id: string; name: string }[]> {
  if (!postIds.length) return [];
  const res = await db
    .prepare(`SELECT n.post_id AS post_id, n.user_id AS user_id, COALESCE(u.first_name, 'Someone') AS name FROM crew_nice n LEFT JOIN users u ON u.id = n.user_id WHERE n.post_id IN (${postIds.map(() => "?").join(",")})`)
    .bind(...postIds)
    .all<{ post_id: string; user_id: string; name: string }>();
  return res.results;
}

export async function toggleNice(db: D1Database, postId: string, userId: string, createdAt: string): Promise<boolean> {
  const row = await db.prepare("SELECT post_id FROM crew_nice WHERE post_id = ? AND user_id = ?").bind(postId, userId).first();
  if (row) {
    await db.prepare("DELETE FROM crew_nice WHERE post_id = ? AND user_id = ?").bind(postId, userId).run();
    return false;
  }
  await db.prepare("INSERT INTO crew_nice (post_id, user_id, created_at) VALUES (?, ?, ?)").bind(postId, userId, createdAt).run();
  return true;
}

/** The last one out closes the crew: link, posts and cheers go with it. */
export async function closeIfEmpty(db: D1Database, crewId: string): Promise<void> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM crew_members WHERE crew_id = ?").bind(crewId).first<{ n: number }>();
  if ((row?.n ?? 0) > 0) return;
  await db.prepare("DELETE FROM crew_nice WHERE post_id IN (SELECT id FROM crew_posts WHERE crew_id = ?)").bind(crewId).run();
  await db.prepare("DELETE FROM crew_posts WHERE crew_id = ?").bind(crewId).run();
  await db.prepare("DELETE FROM crew_invites WHERE crew_id = ?").bind(crewId).run();
  await db.prepare("DELETE FROM crews WHERE id = ?").bind(crewId).run();
}
