-- WP-A4 phones on the table. Table meetings are interactions of kind
-- 'table' (user ids and day only, no place, no names). Leaving the table is
-- recorded per membership so the debrief still finds everyone who was there.
PRAGMA foreign_keys = OFF;
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
PRAGMA foreign_keys = ON;

ALTER TABLE room_members ADD COLUMN table_left_at TEXT;
