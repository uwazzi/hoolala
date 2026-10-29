-- WP30: friends. One small private crew per person, joined by invite link;
-- timeline posts with an honest tag; NICE ONE only, no counts per person.
CREATE TABLE crews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  shared_library_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE crew_members (
  crew_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (crew_id, user_id)
);
CREATE INDEX idx_crew_members_user ON crew_members(user_id);
CREATE TABLE crew_invites (
  token_hash TEXT PRIMARY KEY,
  crew_id TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE TABLE crew_posts (
  id TEXT PRIMARY KEY,
  crew_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  outcome TEXT NOT NULL,
  text TEXT NOT NULL,
  screening_verdict TEXT NOT NULL DEFAULT 'approved_by_rules',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_crew_posts_crew ON crew_posts(crew_id);
CREATE TABLE crew_nice (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);
