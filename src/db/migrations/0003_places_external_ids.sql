-- WP20: places picked from a map keep the provider's id, so the same place is
-- never added twice. Google content is never stored beyond its place id.
ALTER TABLE places ADD COLUMN osm_id TEXT;
CREATE UNIQUE INDEX idx_places_google ON places(google_place_id) WHERE google_place_id IS NOT NULL;
CREATE UNIQUE INDEX idx_places_osm ON places(osm_id) WHERE osm_id IS NOT NULL;
