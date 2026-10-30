// Owner dashboard counts. Aggregate only, sample rows never counted:
// deleted and sample users are out, and interactions at SAMPLE places.

import type { D1Database } from "../types";

export interface DashboardCounts {
  users: number;
  interactions: number;
  leaves: number;
  sentiment: { went_well: number; no_reply: number; awkward: number; didnt_happen: number };
}

const REAL_USERS = "deleted_at IS NULL AND is_sample = 0";
const REAL_PLACE = "(place_id IS NULL OR place_id NOT IN (SELECT id FROM places WHERE is_sample = 1))";

export async function dashboardCounts(db: D1Database): Promise<DashboardCounts> {
  const users = await db.prepare(`SELECT COUNT(*) AS n FROM users WHERE ${REAL_USERS}`).first<number>("n");
  const interactions = await db.prepare(`SELECT COUNT(*) AS n FROM interactions WHERE ${REAL_PLACE}`).first<number>("n");
  const rows = await db
    .prepare(
      "SELECT t.outcome AS outcome, COUNT(*) AS n FROM tries t JOIN users u ON u.id = t.user_id WHERE u.deleted_at IS NULL AND u.is_sample = 0 GROUP BY t.outcome",
    )
    .all<{ outcome: string; n: number }>();
  const sentiment: DashboardCounts["sentiment"] = { went_well: 0, no_reply: 0, awkward: 0, didnt_happen: 0 };
  for (const r of rows.results) {
    if (r.outcome in sentiment) sentiment[r.outcome as keyof typeof sentiment] = r.n;
  }
  const leaves = sentiment.went_well + sentiment.no_reply + sentiment.awkward;
  return { users: users ?? 0, interactions: interactions ?? 0, leaves, sentiment };
}
