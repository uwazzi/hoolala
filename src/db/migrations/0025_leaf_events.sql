-- WP-A6 leaves for real connections. A recorded table meeting grows 5
-- leaves, once per person per room. Tiny-try leaves keep being counted from
-- outcomes, never stored; only meet leaves land here.
CREATE TABLE leaf_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('try', 'meet')),
  amount INTEGER NOT NULL,
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_leaf_meet_once ON leaf_events(user_id, room_id) WHERE source = 'meet' AND room_id IS NOT NULL;
CREATE INDEX idx_leaf_user ON leaf_events(user_id);
