-- Places keep the town or village they're in as people write it ("Échallens"),
-- plus a key without accents or case ("echallens") that search compares.
-- Existing rows held city ids from the fixed list; they become display names.
ALTER TABLE places ADD COLUMN city_key TEXT;
UPDATE places SET city = CASE city
  WHEN 'lausanne' THEN 'Lausanne'
  WHEN 'geneva' THEN 'Geneva'
  WHEN 'zurich' THEN 'Zurich'
  WHEN 'bern' THEN 'Bern'
  WHEN 'basel' THEN 'Basel'
  ELSE city END;
UPDATE places SET city_key = lower(city) WHERE city IS NOT NULL;
CREATE INDEX idx_places_city_key ON places(city_key);
