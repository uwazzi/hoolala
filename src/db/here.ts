// WP22: signals, curious requests, quick replies, blocks and reports.
// The only place their SQL lives. Visibility is decided in src/rules/here.ts;
// these queries only fetch candidates.

import type { D1Database, QuickReplyKind, SignalResponseRow, SignalRow } from "../types";

/** Open, unexpired place signals, with whether the owner is still checked in there. */
export async function candidateSignals(
  db: D1Database,
  placeId: string,
  nowIso: string,
): Promise<(SignalRow & { owner_here: number })[]> {
  const { results } = await db
    .prepare(
      `SELECT s.*, EXISTS (
         SELECT 1 FROM checkins c WHERE c.user_id = s.owner_id AND c.place_id = s.place_id
           AND c.left_at IS NULL AND c.ends_at > ?) AS owner_here
       FROM signals s
       WHERE s.place_id = ? AND s.audience = 'place' AND s.state = 'open' AND s.expires_at > ?
       ORDER BY s.created_at ASC LIMIT 50`,
    )
    .bind(nowIso, placeId, nowIso)
    .all<SignalRow & { owner_here: number }>();
  return results;
}

/** Everyone this person has blocked or been blocked by. */
export async function blockedIds(db: D1Database, userId: string): Promise<Set<string>> {
  const { results } = await db
    .prepare(
      `SELECT blocked_id AS id FROM blocks WHERE blocker_id = ?
       UNION SELECT blocker_id AS id FROM blocks WHERE blocked_id = ?`,
    )
    .bind(userId, userId)
    .all<{ id: string }>();
  return new Set(results.map((r) => r.id));
}

/** The person's own signals that are still live. */
export async function ownSignals(db: D1Database, userId: string, nowIso: string): Promise<SignalRow[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM signals WHERE owner_id = ? AND state IN ('open', 'full') AND expires_at > ?
       ORDER BY created_at DESC`,
    )
    .bind(userId, nowIso)
    .all<SignalRow>();
  return results;
}

export async function countOpenSignals(db: D1Database, userId: string, nowIso: string): Promise<number> {
  return (
    (await db
      .prepare("SELECT COUNT(*) AS n FROM signals WHERE owner_id = ? AND state IN ('open', 'full') AND expires_at > ?")
      .bind(userId, nowIso)
      .first<number>("n")) ?? 0
  );
}

export async function countCuriousSince(db: D1Database, userId: string, sinceIso: string): Promise<number> {
  return (
    (await db
      .prepare("SELECT COUNT(*) AS n FROM signal_responses WHERE responder_id = ? AND created_at > ?")
      .bind(userId, sinceIso)
      .first<number>("n")) ?? 0
  );
}

export type ResponseWithName = SignalResponseRow & { responder_name: string | null };

export async function responsesFor(db: D1Database, signalIds: string[]): Promise<ResponseWithName[]> {
  if (!signalIds.length) return [];
  const { results } = await db
    .prepare(
      `SELECT r.*, u.first_name AS responder_name FROM signal_responses r JOIN users u ON u.id = r.responder_id
       WHERE r.signal_id IN (${signalIds.map(() => "?").join(", ")}) ORDER BY r.created_at ASC`,
    )
    .bind(...signalIds)
    .all<ResponseWithName>();
  return results;
}

export type JoinedRow = SignalResponseRow & {
  owner_id: string;
  owner_name: string | null;
  topic: string;
  translation: string | null;
  when_at: string | null;
  spot: string | null;
  expires_at: string;
  signal_state: SignalRow["state"];
  owner_sample: number;
};

/** Signals this person said I'M CURIOUS to, still live or decided in the last 2 hours. */
export async function ownResponses(db: D1Database, userId: string, sinceIso: string): Promise<JoinedRow[]> {
  const { results } = await db
    .prepare(
      `SELECT r.*, s.owner_id, u.first_name AS owner_name, u.is_sample AS owner_sample, s.topic, s.translation, s.when_at, s.spot, s.expires_at, s.state AS signal_state
       FROM signal_responses r JOIN signals s ON s.id = r.signal_id JOIN users u ON u.id = s.owner_id
       WHERE r.responder_id = ? AND r.state != 'withdrawn' AND s.created_at > ?
       ORDER BY r.created_at DESC LIMIT 10`,
    )
    .bind(userId, sinceIso)
    .all<JoinedRow>();
  return results;
}

export async function getSignal(db: D1Database, id: string): Promise<SignalRow | null> {
  return db.prepare("SELECT * FROM signals WHERE id = ?").bind(id).first<SignalRow>();
}

export async function getResponse(db: D1Database, id: string): Promise<SignalResponseRow | null> {
  return db.prepare("SELECT * FROM signal_responses WHERE id = ?").bind(id).first<SignalResponseRow>();
}

export async function findResponse(db: D1Database, signalId: string, responderId: string): Promise<SignalResponseRow | null> {
  return db
    .prepare("SELECT * FROM signal_responses WHERE signal_id = ? AND responder_id = ? AND state != 'withdrawn'")
    .bind(signalId, responderId)
    .first<SignalResponseRow>();
}

export async function insertSignal(
  db: D1Database,
  s: {
    id: string; ownerId: string; placeId: string; topic: string; whenAt: string; spot: string; capacity: number;
    createdAt: string; expiresAt: string; verdict: string; category?: string | null; lang?: string | null; translation?: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO signals (id, owner_id, audience, place_id, topic, when_at, spot, capacity, screening_verdict, screening_category, lang, translation, created_at, expires_at, state)
       VALUES (?, ?, 'place', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
    )
    .bind(s.id, s.ownerId, s.placeId, s.topic, s.whenAt, s.spot, s.capacity, s.verdict, s.category ?? null, s.lang ?? null, s.translation ?? null, s.createdAt, s.expiresAt)
    .run();
}

export async function cancelSignal(db: D1Database, id: string, ownerId: string): Promise<boolean> {
  const res = await db
    .prepare("UPDATE signals SET state = 'cancelled' WHERE id = ? AND owner_id = ? AND state IN ('open', 'full')")
    .bind(id, ownerId)
    .run();
  return (res.meta?.changes ?? 0) === 1;
}

export async function insertResponse(
  db: D1Database,
  r: { id: string; signalId: string; responderId: string; line: string | null; createdAt: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO signal_responses (id, signal_id, responder_id, line, state, created_at) VALUES (?, ?, ?, ?, 'requested', ?)")
    .bind(r.id, r.signalId, r.responderId, r.line, r.createdAt)
    .run();
}

/**
 * Accepts only while there is room, counted inside the statement so two
 * taps at once can't overfill. Then marks the signal full when it is.
 */
export async function acceptResponse(db: D1Database, responseId: string, signalId: string, nowIso: string): Promise<boolean> {
  const [accepted] = (await db.batch([
    db
      .prepare(
        `UPDATE signal_responses SET state = 'accepted', decided_at = ?
         WHERE id = ? AND state = 'requested'
           AND (SELECT COUNT(*) FROM signal_responses WHERE signal_id = ? AND state = 'accepted')
               < (SELECT capacity FROM signals WHERE id = ? AND state = 'open')`,
      )
      .bind(nowIso, responseId, signalId, signalId),
    db
      .prepare(
        `UPDATE signals SET state = 'full' WHERE id = ? AND state = 'open'
           AND (SELECT COUNT(*) FROM signal_responses WHERE signal_id = ? AND state = 'accepted') >= capacity`,
      )
      .bind(signalId, signalId),
  ])) as { meta?: { changes?: number }; changes?: number }[];
  return (accepted?.meta?.changes ?? accepted?.changes ?? 0) === 1;
}

export async function declineResponse(db: D1Database, responseId: string, nowIso: string): Promise<boolean> {
  const res = await db
    .prepare("UPDATE signal_responses SET state = 'declined', decided_at = ? WHERE id = ? AND state = 'requested'")
    .bind(nowIso, responseId)
    .run();
  return (res.meta?.changes ?? 0) === 1;
}

export async function insertQuickReply(
  db: D1Database,
  q: { id: string; signalId: string; userId: string; kind: QuickReplyKind; createdAt: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO quick_replies (id, signal_id, user_id, kind, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(q.id, q.signalId, q.userId, q.kind, q.createdAt)
    .run();
}

export async function quickRepliesFor(
  db: D1Database,
  signalIds: string[],
): Promise<{ signal_id: string; user_id: string; kind: QuickReplyKind; created_at: string; first_name: string | null }[]> {
  if (!signalIds.length) return [];
  const { results } = await db
    .prepare(
      `SELECT q.signal_id, q.user_id, q.kind, q.created_at, u.first_name FROM quick_replies q JOIN users u ON u.id = q.user_id
       WHERE q.signal_id IN (${signalIds.map(() => "?").join(", ")}) ORDER BY q.created_at ASC`,
    )
    .bind(...signalIds)
    .all();
  return results as { signal_id: string; user_id: string; kind: QuickReplyKind; created_at: string; first_name: string | null }[];
}

export async function insertBlock(db: D1Database, blockerId: string, blockedId: string, nowIso: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)")
    .bind(blockerId, blockedId, nowIso)
    .run();
}

/** Report hides the item at once for everyone and logs it for review. */
export async function reportItem(
  db: D1Database,
  r: { id: string; reporterId: string; targetUserId: string; signalId: string | null; responseId: string | null; reason: string; createdAt: string },
): Promise<void> {
  const statements = [
    db
      .prepare("INSERT INTO reports (id, reporter_id, target_user_id, signal_id, reason, created_at, status) VALUES (?, ?, ?, ?, ?, ?, 'open')")
      .bind(r.id, r.reporterId, r.targetUserId, r.signalId, r.reason, r.createdAt),
  ];
  if (r.responseId) {
    statements.push(db.prepare("UPDATE signal_responses SET state = 'withdrawn' WHERE id = ?").bind(r.responseId));
  } else if (r.signalId) {
    statements.push(db.prepare("UPDATE signals SET state = 'cancelled' WHERE id = ?").bind(r.signalId));
  }
  await db.batch(statements);
}
