// Say-hi feedback rows. The only place their SQL lives.

import type { D1Database, FeedbackRow } from "../types";

export async function insertFeedback(
  db: D1Database,
  f: { id: string; userId: string; firstName: string | null; screen: string; message: string; logJson: string; nowIso: string },
): Promise<void> {
  await db
    .prepare("INSERT INTO feedback (id, user_id, first_name, screen, message, log_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(f.id, f.userId, f.firstName, f.screen, f.message, f.logJson, f.nowIso)
    .run();
}

export async function recentFeedback(db: D1Database, limit = 20): Promise<FeedbackRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?")
    .bind(Math.min(limit, 50))
    .all<FeedbackRow>();
  return results;
}
