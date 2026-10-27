-- WP1: full D1 schema from docs/BUILD-PLAN.md.
-- Conventions: TEXT ids, ISO 8601 UTC timestamps, 0/1 booleans.
-- Privacy-critical: checkin_attempts has no user id and no coordinates;
-- checkins holds no coordinates; llm_calls holds no prompt or user text.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  telegram_user_id TEXT UNIQUE,
  first_name TEXT,
  is_adult INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_telegram ON users(telegram_user_id);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX idx_login_tokens_email ON login_tokens(email);

CREATE TABLE compass_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  part TEXT NOT NULL CHECK (part IN ('interest', 'talk_about', 'more_of', 'filter')),
  text TEXT NOT NULL,
  source_url TEXT,
  origin TEXT NOT NULL CHECK (origin IN ('find_me', 'questions', 'edit')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_compass_user ON compass_items(user_id);

CREATE TABLE compass_changes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  before TEXT NOT NULL,
  after TEXT NOT NULL,
  words TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  undone_at TEXT
);
CREATE INDEX idx_compass_changes_user ON compass_changes(user_id);

CREATE TABLE places (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('cafe', 'bar', 'coworking', 'library', 'other')),
  city TEXT,
  lat REAL,
  lng REAL,
  radius_m INTEGER NOT NULL DEFAULT 150,
  google_place_id TEXT,
  spots_json TEXT,
  code TEXT,
  poster_key_hash TEXT,
  added_by TEXT REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'active', 'hidden')),
  first_other_checkin_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_places_city ON places(city);
CREATE INDEX idx_places_status ON places(status);
CREATE UNIQUE INDEX idx_places_code ON places(code) WHERE code IS NOT NULL;

CREATE TABLE place_facts (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id),
  field TEXT NOT NULL CHECK (field IN ('hours', 'menu_item', 'price', 'spot', 'wifi', 'sockets', 'quiet', 'rule')),
  value TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('people', 'google', 'web', 'snap')),
  source_url TEXT,
  state TEXT NOT NULL DEFAULT 'found' CHECK (state IN ('found', 'confirmed', 'disputed')),
  added_by TEXT REFERENCES users(id),
  confirmations INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_facts_place ON place_facts(place_id);

-- month is YYYY-MM, for the one-confirm-per-fact-per-person-per-month rule.
CREATE TABLE place_contributions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  place_id TEXT NOT NULL REFERENCES places(id),
  fact_id TEXT REFERENCES place_facts(id),
  action TEXT NOT NULL CHECK (action IN ('add_place', 'add_fact', 'fix_fact', 'confirm_fact')),
  points INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'counted', 'rejected')),
  month TEXT NOT NULL,
  created_at TEXT NOT NULL,
  counted_at TEXT,
  UNIQUE (user_id, fact_id, action, month)
);
CREATE INDEX idx_contrib_user ON place_contributions(user_id);

CREATE TABLE checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  place_id TEXT NOT NULL REFERENCES places(id),
  method TEXT NOT NULL CHECK (method IN ('location', 'add', 'search', 'qr', 'code')),
  started_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  left_at TEXT
);
CREATE INDEX idx_checkins_user ON checkins(user_id);
CREATE INDEX idx_checkins_place ON checkins(place_id, ends_at);

CREATE TABLE checkin_attempts (
  id TEXT PRIMARY KEY,
  place_id TEXT REFERENCES places(id),
  method TEXT NOT NULL CHECK (method IN ('location', 'add', 'search', 'qr', 'code')),
  ok INTEGER NOT NULL,
  reason TEXT CHECK (reason IN ('no_places_nearby', 'permission_denied', 'out_of_city', 'bad_key', 'wrong_code', 'expired')),
  created_at TEXT NOT NULL
);

CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  audience TEXT NOT NULL CHECK (audience IN ('place', 'circle', 'private')),
  place_id TEXT REFERENCES places(id),
  topic TEXT NOT NULL,
  when_at TEXT,
  spot TEXT,
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 3),
  lang TEXT,
  translation TEXT,
  screening_verdict TEXT,
  screening_category TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'full', 'cancelled', 'expired'))
);
CREATE INDEX idx_signals_place ON signals(place_id, state, expires_at);
CREATE INDEX idx_signals_owner ON signals(owner_id, state);

CREATE TABLE signal_responses (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES signals(id),
  responder_id TEXT NOT NULL REFERENCES users(id),
  line TEXT,
  state TEXT NOT NULL DEFAULT 'requested' CHECK (state IN ('requested', 'accepted', 'declined', 'withdrawn')),
  created_at TEXT NOT NULL,
  decided_at TEXT
);
CREATE INDEX idx_responses_signal ON signal_responses(signal_id);

CREATE TABLE quick_replies (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL REFERENCES signals(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('on_my_way', 'five_late', 'cant_make_it', 'at_spot')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_quick_signal ON quick_replies(signal_id);

CREATE TABLE meeting_points (
  signal_id TEXT PRIMARY KEY REFERENCES signals(id),
  spot TEXT,
  time TEXT,
  proposed_by TEXT NOT NULL CHECK (proposed_by IN ('person', 'agent')),
  confirmed_at TEXT
);

CREATE TABLE blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id),
  blocked_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  target_user_id TEXT REFERENCES users(id),
  signal_id TEXT REFERENCES signals(id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);

CREATE TABLE meet_exchanges (
  id TEXT PRIMARY KEY,
  initiator_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  joiner_id TEXT REFERENCES users(id),
  initiator_agreed_at TEXT,
  joiner_agreed_at TEXT,
  signal_id TEXT REFERENCES signals(id)
);

CREATE TABLE interactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('here', 'meet', 'invitation')),
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  place_id TEXT REFERENCES places(id),
  signal_id TEXT REFERENCES signals(id),
  day TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  UNIQUE (kind, user_a, user_b, day)
);
CREATE INDEX idx_interactions_day ON interactions(day);

CREATE TABLE stay_in_touch (
  user_id TEXT NOT NULL REFERENCES users(id),
  other_id TEXT NOT NULL REFERENCES users(id),
  signal_id TEXT NOT NULL REFERENCES signals(id),
  chosen_at TEXT NOT NULL,
  PRIMARY KEY (user_id, other_id, signal_id)
);

CREATE TABLE friendships (
  user_a TEXT NOT NULL,
  user_b TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  PRIMARY KEY (user_a, user_b)
);

CREATE TABLE moments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  interaction_id TEXT NOT NULL REFERENCES interactions(id),
  label TEXT NOT NULL
);
CREATE INDEX idx_moments_user ON moments(user_id);

CREATE TABLE workings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  function TEXT NOT NULL CHECK (function IN ('findme', 'place', 'suggest', 'screen', 'plan', 'snap')),
  tools_json TEXT NOT NULL,
  citations_json TEXT NOT NULL,
  verdict TEXT,
  grounded_count INTEGER,
  total_count INTEGER,
  reasoning_effort TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_workings_user ON workings(user_id, created_at);

CREATE TABLE llm_calls (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  model TEXT NOT NULL,
  latency_ms INTEGER,
  tool_calls INTEGER,
  validated INTEGER,
  fallback_used INTEGER,
  created_at TEXT NOT NULL
);

CREATE TABLE metrics_daily (
  place_id TEXT NOT NULL REFERENCES places(id),
  day TEXT NOT NULL,
  checkin_attempts INTEGER NOT NULL DEFAULT 0,
  checkin_ok_first_try INTEGER NOT NULL DEFAULT 0,
  places_added INTEGER NOT NULL DEFAULT 0,
  facts_found INTEGER NOT NULL DEFAULT 0,
  facts_confirmed INTEGER NOT NULL DEFAULT 0,
  facts_fixed INTEGER NOT NULL DEFAULT 0,
  signals INTEGER NOT NULL DEFAULT 0,
  signals_with_response INTEGER NOT NULL DEFAULT 0,
  responses INTEGER NOT NULL DEFAULT 0,
  accepted INTEGER NOT NULL DEFAULT 0,
  confirmed_meets INTEGER NOT NULL DEFAULT 0,
  stay_in_touch INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (place_id, day)
);
