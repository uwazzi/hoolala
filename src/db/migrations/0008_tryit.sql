-- WP29: workings learns try_it (SQLite cannot widen a CHECK, so the table
-- is rebuilt); tries keeps try_it drafts for the record.
CREATE TABLE workings_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  function TEXT NOT NULL CHECK (function IN ('findme', 'place', 'suggest', 'screen', 'plan', 'snap', 'try_it')),
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
ALTER TABLE tries ADD COLUMN title TEXT;
ALTER TABLE tries ADD COLUMN hint TEXT;
ALTER TABLE tries ADD COLUMN why TEXT;
