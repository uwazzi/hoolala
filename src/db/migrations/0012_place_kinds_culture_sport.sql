-- WP32 v6.1: places gain culture and sport kinds (theatres, cinemas, museums,
-- pools, gyms), so the scan lists meeting places of every kind. Rebuilds
-- the kind CHECK.
CREATE TABLE places_new (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('cafe', 'bar', 'coworking', 'library', 'food', 'shop', 'outdoors', 'culture', 'sport', 'other')),
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
  created_at TEXT NOT NULL,
  osm_id TEXT,
  city_key TEXT,
  is_sample INTEGER NOT NULL DEFAULT 0,
  checkin_count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO places_new SELECT * FROM places;
DROP TABLE places;
ALTER TABLE places_new RENAME TO places;
CREATE INDEX idx_places_city ON places(city);
CREATE INDEX idx_places_status ON places(status);
CREATE UNIQUE INDEX idx_places_code ON places(code) WHERE code IS NOT NULL;
CREATE UNIQUE INDEX idx_places_google ON places(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE UNIQUE INDEX idx_places_osm ON places(osm_id) WHERE osm_id IS NOT NULL;
CREATE INDEX idx_places_city_key ON places(city_key);
