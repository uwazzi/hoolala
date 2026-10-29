-- WP28: tiny tries. One row per try told (TELL ME); the step is assigned by
-- code from the person's current step. Leaves are counted, never stored.
ALTER TABLE users ADD COLUMN current_step INTEGER NOT NULL DEFAULT 1;
CREATE TABLE tries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'library',
  library_id TEXT,
  place_kind TEXT NOT NULL DEFAULT 'anywhere',
  outcome TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_tries_user ON tries(user_id);
