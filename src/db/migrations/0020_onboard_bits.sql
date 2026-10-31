-- WP39 keeping the juicy bits: the extras saved at LOOKS RIGHT (battery,
-- off-table list, nearly-said line) for the compass check and the game.
-- Replaced on every save with bits; removed with the account by cascade.
-- workings rows for juicy join the function check.
CREATE TABLE onboard_bits (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  battery TEXT,
  offtable_json TEXT NOT NULL DEFAULT '[]',
  nearly_line TEXT,
  nearly_to_role TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE workings_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  function TEXT NOT NULL CHECK (function IN ('findme', 'compassdraft', 'place', 'suggest', 'screen', 'plan', 'snap', 'try_it', 'why_go', 'read_it', 'juicy')),
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
