-- WP-A4 phones on the table. Table meetings are interactions of kind
-- 'table' (user ids and day only, no place, no names). Leaving the table is
-- recorded per membership so the debrief still finds everyone who was there.
--
-- D1 enforces foreign keys and ignores PRAGMA foreign_keys, so a referenced
-- table cannot be dropped. moments is rebuilt first without its link to
-- interactions (dropping a child is always safe), then interactions is
-- rebuilt, then the link is restored. Runs clean with keys on or off.
DROP TABLE IF EXISTS interactions_new;
DROP TABLE IF EXISTS moments_new;
DROP TABLE IF EXISTS moments_final;

CREATE TABLE moments_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  interaction_id TEXT NOT NULL,
  label TEXT NOT NULL
);
INSERT INTO moments_new SELECT * FROM moments;
DROP TABLE moments;
ALTER TABLE moments_new RENAME TO moments;

CREATE TABLE interactions_new (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('here', 'meet', 'invitation', 'table')),
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  place_id TEXT REFERENCES places(id),
  signal_id TEXT REFERENCES signals(id),
  day TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  UNIQUE (kind, user_a, user_b, day)
);
INSERT INTO interactions_new SELECT * FROM interactions;
DROP TABLE interactions;
ALTER TABLE interactions_new RENAME TO interactions;
CREATE INDEX idx_interactions_day ON interactions(day);

CREATE TABLE moments_final (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  interaction_id TEXT NOT NULL REFERENCES interactions(id),
  label TEXT NOT NULL
);
INSERT INTO moments_final SELECT * FROM moments;
DROP TABLE moments;
ALTER TABLE moments_final RENAME TO moments;
CREATE INDEX idx_moments_user ON moments(user_id);

ALTER TABLE room_members ADD COLUMN table_left_at TEXT;
