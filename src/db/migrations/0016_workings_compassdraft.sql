-- v6.2 get personal (WP36): workings rows for compassdraft. findme stays in
-- the CHECK so historical rows keep working.
CREATE TABLE workings_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  function TEXT NOT NULL CHECK (function IN ('findme', 'compassdraft', 'place', 'suggest', 'screen', 'plan', 'snap', 'try_it', 'why_go', 'read_it')),
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
