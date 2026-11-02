-- WP-A5 how did it go. Debriefs are private to the person (the owner sees
-- aggregates only); owner feedback carries no user id, no room id, no place
-- and is deleted after 90 days; stay-in-touch choices are per table pair.
CREATE TABLE debriefs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  battery INTEGER CHECK (battery IS NULL OR (battery >= 1 AND battery <= 5)),
  chat TEXT CHECK (chat IS NULL OR chat IN ('awkward', 'ok', 'good', 'great')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, room_id)
);

CREATE TABLE owner_feedback (
  id TEXT PRIMARY KEY,
  tag TEXT CHECK (tag IS NULL OR tag IN ('good', 'bad', 'idea')),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  app_version TEXT NOT NULL
);
CREATE INDEX idx_owner_feedback_created ON owner_feedback(created_at);

CREATE TABLE stay_room (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  other_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  chosen_at TEXT NOT NULL,
  PRIMARY KEY (user_id, other_id, room_id)
);
