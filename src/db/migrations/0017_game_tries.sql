-- WP37: games of tiny tries. One row per try shown; the picked try is also
-- today's try. Games older than 7 days are deleted.
CREATE TABLE game_tries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  level TEXT NOT NULL,
  step INTEGER NOT NULL,
  kind TEXT NOT NULL,
  who_role TEXT,
  title TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'library',
  created_at TEXT NOT NULL,
  picked_at TEXT
);
CREATE INDEX idx_game_tries_user_game ON game_tries(user_id, game_id);
