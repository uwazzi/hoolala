// Poster scan counts. One row per day and GPS zone, bumped on every
// poster scan; the dashboard reads hotspots from here. Counts only:
// zones are snapped 200 m cells (or "unknown"), never exact positions,
// and no user id is ever stored.

import type { D1Database } from "../types";

export async function recordPosterScan(db: D1Database, day: string, zone: string, locality: string | null): Promise<void> {
  await db
    .prepare(
      `INSERT INTO poster_scans (day, zone, locality, scans) VALUES (?, ?, ?, 1)
       ON CONFLICT (day, zone) DO UPDATE SET scans = scans + 1, locality = COALESCE(excluded.locality, locality)`,
    )
    .bind(day, zone, locality)
    .run();
}

export interface PosterHotspot {
  zone: string;
  locality: string | null;
  scans: number;
}

export async function posterHotspots(db: D1Database, limit = 20): Promise<PosterHotspot[]> {
  const { results } = await db
    .prepare("SELECT zone, MAX(locality) AS locality, SUM(scans) AS scans FROM poster_scans GROUP BY zone ORDER BY scans DESC LIMIT ?")
    .bind(limit)
    .all<PosterHotspot>();
  return results;
}
