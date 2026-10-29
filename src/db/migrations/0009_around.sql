-- WP32: talking ratings (one value per place, person and day), a privacy-safe
-- visit counter per place, and workings rows for why_go and read_it.
CREATE TABLE place_ratings (
  place_id TEXT NOT NULL REFERENCES places(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  value INTEGER NOT NULL CHECK (value IN (1, 2, 3)),
  visit_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (place_id, user_id, visit_date)
);
CREATE INDEX idx_place_ratings_place ON place_ratings(place_id, visit_date);
ALTER TABLE places ADD COLUMN checkin_count INTEGER NOT NULL DEFAULT 0;
CREATE TABLE workings_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  function TEXT NOT NULL CHECK (function IN ('findme', 'place', 'suggest', 'screen', 'plan', 'snap', 'try_it', 'why_go', 'read_it')),
  tools_json TEXT NOT NULL,
  citations_json TEXT NOT NULL,
  verdict TEXT,
  grounded_count INTEGER,
  total_count INTEGER,
  reasoning_effort TEXT,
  created_at TEXT NOT NULL
);
INSERT INTO workings_new SELECT * FROM workings;
DROP TABLE workings;
ALTER TABLE workings_new RENAME TO workings;
CREATE INDEX idx_workings_user ON workings(user_id, created_at);
