// WP9: keeps the SAMPLE place, Sample Sophie, her check-in and her open
// signal in place. Idempotent; safe to call from the cron and on every visit.

import { expiresAt } from "../rules/here";
import { SAMPLE_PERSON, SAMPLE_PLACE, sampleNeedsCheckin, sampleNeedsSignal, sampleTopic } from "../rules/sample";
import type { D1Database } from "../types";

export async function ensureSample(db: D1Database, now: Date): Promise<void> {
  const nowIso = now.toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO users (id, email, first_name, is_adult, created_at, is_sample)
         VALUES (?, NULL, ?, 1, ?, 1)`,
      )
      .bind(SAMPLE_PERSON.id, SAMPLE_PERSON.firstName, nowIso),
    db
      .prepare(
        `INSERT OR IGNORE INTO places (id, slug, name, kind, city, city_key, lat, lng, code, status, created_at, is_sample)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, 'active', ?, 1)`,
      )
      .bind(SAMPLE_PLACE.id, SAMPLE_PLACE.slug, SAMPLE_PLACE.name, SAMPLE_PLACE.kind, SAMPLE_PLACE.city, "sample", SAMPLE_PLACE.code, nowIso),
  ]);

  const checkin = await db
    .prepare("SELECT ends_at FROM checkins WHERE user_id = ? AND place_id = ? AND left_at IS NULL AND ends_at > ? ORDER BY ends_at DESC LIMIT 1")
    .bind(SAMPLE_PERSON.id, SAMPLE_PLACE.id, nowIso)
    .first<string>("ends_at");
  if (sampleNeedsCheckin(checkin, now)) {
    await db
      .prepare("INSERT INTO checkins (id, user_id, place_id, method, started_at, ends_at, left_at) VALUES (?, ?, ?, 'code', ?, ?, NULL)")
      .bind(crypto.randomUUID(), SAMPLE_PERSON.id, SAMPLE_PLACE.id, nowIso, new Date(now.getTime() + 4 * 3600_000).toISOString())
      .run();
  }

  const signal = await db
    .prepare("SELECT expires_at FROM signals WHERE owner_id = ? AND place_id = ? AND state = 'open' AND expires_at > ? ORDER BY expires_at DESC LIMIT 1")
    .bind(SAMPLE_PERSON.id, SAMPLE_PLACE.id, nowIso)
    .first<string>("expires_at");
  if (sampleNeedsSignal(signal, now)) {
    await db
      .prepare(
        `INSERT INTO signals (id, owner_id, audience, place_id, topic, when_at, spot, capacity, screening_verdict, created_at, expires_at, state)
         VALUES (?, ?, 'place', ?, ?, ?, 'The big table', 3, 'sample', ?, ?, 'open')`,
      )
      .bind(crypto.randomUUID(), SAMPLE_PERSON.id, SAMPLE_PLACE.id, sampleTopic(now), nowIso, nowIso, expiresAt(now, new Date(now.getTime() + 60 * 60_000)))
      .run();
  }
}

export async function isSampleUser(db: D1Database, userId: string): Promise<boolean> {
  return (await db.prepare("SELECT is_sample FROM users WHERE id = ?").bind(userId).first<number>("is_sample")) === 1;
}
