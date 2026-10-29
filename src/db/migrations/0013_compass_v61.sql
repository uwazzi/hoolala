-- WP33: v6.1 compass parts (interest/intention/filter/delivery/action) and new
-- origins (feedback/suggest/delivery), plus kind/proposed/confirmed on the
-- undo log. FK-clean: compass_items and compass_changes are leaves (nothing
-- references them), so rebuilds here cannot trip the D1 FK freeze.

CREATE TABLE compass_items_v61 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  part TEXT NOT NULL CHECK (part IN ('interest', 'intention', 'filter', 'delivery', 'action')),
  text TEXT NOT NULL,
  source_url TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('find_me', 'questions', 'edit', 'feedback', 'suggest', 'delivery')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
INSERT INTO compass_items_v61 (id, user_id, part, text, source_url, origin, active, created_at)
  SELECT id, user_id,
    CASE part WHEN 'talk_about' THEN 'interest' WHEN 'more_of' THEN 'intention' ELSE part END,
    text, source_url, origin, active, created_at
  FROM compass_items;
DROP TABLE compass_items;
ALTER TABLE compass_items_v61 RENAME TO compass_items;
CREATE INDEX idx_compass_user ON compass_items(user_id);

CREATE TABLE compass_changes_v61 (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('line', 'remove')) DEFAULT 'line',
  line_id TEXT,
  before TEXT,
  after TEXT,
  words TEXT NOT NULL,
  feedback_ref TEXT,
  proposed_at TEXT NOT NULL,
  confirmed_at TEXT,
  undone_at TEXT
);
INSERT INTO compass_changes_v61 (id, user_id, kind, line_id, before, after, words, feedback_ref, proposed_at, confirmed_at, undone_at)
  SELECT id, user_id, 'line', NULL, before, after, words, NULL, confirmed_at, confirmed_at, undone_at
  FROM compass_changes;
DROP TABLE compass_changes;
ALTER TABLE compass_changes_v61 RENAME TO compass_changes;
CREATE INDEX idx_compass_changes_user ON compass_changes(user_id);
