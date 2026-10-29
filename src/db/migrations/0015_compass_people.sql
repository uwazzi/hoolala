-- v6.2 Let's get personal (WP36): the people in your days, as roles only.
-- FIND ME is removed: its stored compass rows go with it (pre-pilot).
CREATE TABLE compass_people (
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL,
  role_class TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'surprise',
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, role)
);
CREATE INDEX idx_people_user ON compass_people(user_id);
DELETE FROM compass_items WHERE origin = 'find_me';
