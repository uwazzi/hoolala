-- WP-A1 icebreaker rooms (v6.4). A room belongs to a rough area: its centre
-- snapped to a 200 m grid (cell_lat, cell_lng) with a 500 m radius. Raw
-- coordinates are never stored here. Rooms, members and replies are deleted
-- 24 h after ends_at; only interactions (IDs, day) survive, as today.
CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  starter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  place_text TEXT NOT NULL,
  cell_lat REAL NOT NULL,
  cell_lng REAL NOT NULL,
  radius_m INTEGER NOT NULL DEFAULT 500,
  lang TEXT,
  translation TEXT,
  opens_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'expired')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_rooms_cell ON rooms(cell_lat, cell_lng);
CREATE INDEX idx_rooms_starter ON rooms(starter_id, status);

CREATE TABLE room_members (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('starter', 'member')),
  line TEXT,
  joined_at TEXT NOT NULL,
  left_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0,
  at_table_at TEXT,
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX idx_room_members_user ON room_members(user_id);

CREATE TABLE room_replies (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (code IN ('AT_THE_SPOT', 'ON_MY_WAY', 'FIVE_LATE', 'CALL_IT_OFF', 'LEAVE')),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_room_replies_room ON room_replies(room_id, created_at);
