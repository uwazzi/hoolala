-- WP32 v6.1: places gain culture and sport kinds, so the scan lists
-- meeting places of every kind. Rebuilds the kind CHECK.
--
-- The rebuild must be FK-clean at every statement: D1 runs migrations
-- where switching enforcement off has no effect, and dropping places
-- while rows reference it fails the whole release (staging freeze,
-- 29 Oct 2026). So every table that references places, and every table
-- that references those, is backed up and emptied leaves-first, then
-- restored root-first. No row is lost: the backup tables go last.
PRAGMA foreign_keys = OFF;
DROP TABLE IF EXISTS places_new;
CREATE TABLE _mig_backup_signal_responses AS SELECT * FROM signal_responses;
CREATE TABLE _mig_backup_quick_replies AS SELECT * FROM quick_replies;
CREATE TABLE _mig_backup_meeting_points AS SELECT * FROM meeting_points;
CREATE TABLE _mig_backup_reports AS SELECT * FROM reports;
CREATE TABLE _mig_backup_meet_exchanges AS SELECT * FROM meet_exchanges;
CREATE TABLE _mig_backup_stay_in_touch AS SELECT * FROM stay_in_touch;
CREATE TABLE _mig_backup_moments AS SELECT * FROM moments;
CREATE TABLE _mig_backup_place_contributions AS SELECT * FROM place_contributions;
CREATE TABLE _mig_backup_interactions AS SELECT * FROM interactions;
CREATE TABLE _mig_backup_place_facts AS SELECT * FROM place_facts;
CREATE TABLE _mig_backup_signals AS SELECT * FROM signals;
CREATE TABLE _mig_backup_checkins AS SELECT * FROM checkins;
CREATE TABLE _mig_backup_checkin_attempts AS SELECT * FROM checkin_attempts;
CREATE TABLE _mig_backup_metrics_daily AS SELECT * FROM metrics_daily;
CREATE TABLE _mig_backup_place_ratings AS SELECT * FROM place_ratings;
DELETE FROM signal_responses;
DELETE FROM quick_replies;
DELETE FROM meeting_points;
DELETE FROM reports;
DELETE FROM meet_exchanges;
DELETE FROM stay_in_touch;
DELETE FROM moments;
DELETE FROM place_contributions;
DELETE FROM interactions;
DELETE FROM place_facts;
DELETE FROM signals;
DELETE FROM checkins;
DELETE FROM checkin_attempts;
DELETE FROM metrics_daily;
DELETE FROM place_ratings;
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
INSERT INTO place_ratings SELECT * FROM _mig_backup_place_ratings;
DROP TABLE _mig_backup_place_ratings;
INSERT INTO metrics_daily SELECT * FROM _mig_backup_metrics_daily;
DROP TABLE _mig_backup_metrics_daily;
INSERT INTO checkin_attempts SELECT * FROM _mig_backup_checkin_attempts;
DROP TABLE _mig_backup_checkin_attempts;
INSERT INTO checkins SELECT * FROM _mig_backup_checkins;
DROP TABLE _mig_backup_checkins;
INSERT INTO signals SELECT * FROM _mig_backup_signals;
DROP TABLE _mig_backup_signals;
INSERT INTO place_facts SELECT * FROM _mig_backup_place_facts;
DROP TABLE _mig_backup_place_facts;
INSERT INTO interactions SELECT * FROM _mig_backup_interactions;
DROP TABLE _mig_backup_interactions;
INSERT INTO place_contributions SELECT * FROM _mig_backup_place_contributions;
DROP TABLE _mig_backup_place_contributions;
INSERT INTO moments SELECT * FROM _mig_backup_moments;
DROP TABLE _mig_backup_moments;
INSERT INTO stay_in_touch SELECT * FROM _mig_backup_stay_in_touch;
DROP TABLE _mig_backup_stay_in_touch;
INSERT INTO meet_exchanges SELECT * FROM _mig_backup_meet_exchanges;
DROP TABLE _mig_backup_meet_exchanges;
INSERT INTO reports SELECT * FROM _mig_backup_reports;
DROP TABLE _mig_backup_reports;
INSERT INTO meeting_points SELECT * FROM _mig_backup_meeting_points;
DROP TABLE _mig_backup_meeting_points;
INSERT INTO quick_replies SELECT * FROM _mig_backup_quick_replies;
DROP TABLE _mig_backup_quick_replies;
INSERT INTO signal_responses SELECT * FROM _mig_backup_signal_responses;
DROP TABLE _mig_backup_signal_responses;
PRAGMA foreign_keys = ON;
