-- WP30 demo crew for the video. Run once against staging:
--   wrangler d1 execute hoolala-staging --remote --file=scripts/demo-crew.sql -c wrangler.staging.toml
-- Rerunnable (INSERT OR IGNORE, except the invite which is refreshed). The
-- invite token demo-crew-1 is public like the DEMO place code; the dare link
-- is /friends/join?token=demo-crew-1 and expires 7 days after seeding.
-- Sample people are never counted anywhere.
INSERT OR IGNORE INTO users (id, first_name, is_adult, created_at, is_sample) VALUES
  ('sample-ana', 'Ana', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1),
  ('sample-tom', 'Tom', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1),
  ('sample-lea', 'Lea', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1);
INSERT OR IGNORE INTO crews (id, name, shared_library_id, created_by, created_at) VALUES
  ('demo-crew', 'Demo crew', '2-anywhere', 'sample-ana', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT OR IGNORE INTO crew_members (crew_id, user_id, joined_at) VALUES
  ('demo-crew', 'sample-ana', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-crew', 'sample-tom', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-crew', 'sample-lea', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT OR REPLACE INTO crew_invites (token_hash, crew_id, created_by, created_at, expires_at) VALUES
  ('6636df0ce1decc2c1d2de6bd93a3fc07950c46ebd415e557bd348e14e956f8a4', 'demo-crew', 'sample-ana', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now','+7 days'));
INSERT OR IGNORE INTO crew_posts (id, crew_id, user_id, outcome, text, screening_verdict, created_at) VALUES
  ('demo-post-1', 'demo-crew', 'sample-ana', 'went_well', 'Said morning to the baker. She gave me the crusty end of the baguette.', 'approved_by_rules', strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 hours')),
  ('demo-post-2', 'demo-crew', 'sample-tom', 'no_reply', 'Bus stop man looked straight through me. Tried again on the tram, got a nod.', 'approved_by_rules', strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')),
  ('demo-post-3', 'demo-crew', 'sample-lea', 'didnt_happen', 'Too wiped out this week. Reading yours is nice though.', 'approved_by_rules', strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days'));
INSERT OR IGNORE INTO crew_nice (post_id, user_id, created_at) VALUES
  ('demo-post-2', 'sample-ana', strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')),
  ('demo-post-2', 'sample-lea', strftime('%Y-%m-%dT%H:%M:%fZ','now','-50 minutes')),
  ('demo-post-3', 'sample-ana', strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour'));
