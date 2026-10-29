-- WP32 demo places around Lausanne Riponne for the video. Run once against staging:
--   wrangler d1 execute hoolala-staging --remote --file=scripts/demo-around.sql -c wrangler.staging.toml
-- Rerunnable (INSERT OR IGNORE / REPLACE). Names are fictional. Sample places
-- and people are never counted anywhere.
INSERT OR IGNORE INTO users (id, first_name, is_adult, created_at, is_sample) VALUES
  ('sample-ana', 'Ana', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1),
  ('sample-tom', 'Tom', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1),
  ('sample-lea', 'Lea', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1);
INSERT OR IGNORE INTO places (id, slug, name, kind, city, city_key, lat, lng, status, created_at, is_sample) VALUES
  ('demo-around-1', 'cafe-riponne', 'Café de la Riponne', 'cafe', 'Lausanne', 'lausanne', 46.5225, 6.6328, 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1),
  ('demo-around-2', 'bar-mok', 'Bar Le Mok', 'bar', 'Lausanne', 'lausanne', 46.5219, 6.6335, 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1),
  ('demo-around-3', 'cowork-verriere', 'Cowork La Verrière', 'coworking', 'Lausanne', 'lausanne', 46.5231, 6.6340, 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1),
  ('demo-around-4', 'biblio-coin', 'Coin Lecture de la Riponne', 'library', 'Lausanne', 'lausanne', 46.5220, 6.6320, 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1),
  ('demo-around-5', 'cafe-tunnel', 'Café du Tunnel', 'cafe', 'Lausanne', 'lausanne', 46.5235, 6.6350, 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1),
  ('demo-around-6', 'buvette-parc', 'Buvette du Parc', 'other', 'Lausanne', 'lausanne', 46.5210, 6.6315, 'active', strftime('%Y-%m-%dT%H:%M:%fZ','now'), 1);
INSERT OR IGNORE INTO place_facts (id, place_id, field, value, source, state, updated_at) VALUES
  ('demo-fact-1', 'demo-around-1', 'spot', 'One long shared table by the window', 'people', 'confirmed', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-fact-2', 'demo-around-1', 'menu_item', 'Oat flat white and cardamom buns', 'people', 'confirmed', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-fact-3', 'demo-around-1', 'hours', 'Open until 18:00', 'people', 'confirmed', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-fact-4', 'demo-around-2', 'quiet', 'Lively after 18:00, calm before', 'people', 'confirmed', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-fact-5', 'demo-around-3', 'wifi', 'Fast wifi and sockets at every desk', 'people', 'confirmed', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-fact-6', 'demo-around-3', 'rule', 'Calls in the phone box only', 'people', 'confirmed', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-fact-7', 'demo-around-4', 'quiet', 'Silent room upstairs', 'people', 'confirmed', strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ('demo-fact-8', 'demo-around-5', 'spot', 'Counter seats facing the roaster', 'people', 'confirmed', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT OR REPLACE INTO place_ratings (place_id, user_id, value, visit_date, created_at) VALUES
  ('demo-around-1', 'sample-ana', 3, date('now','-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')),
  ('demo-around-1', 'sample-tom', 3, date('now','-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days')),
  ('demo-around-1', 'sample-lea', 2, date('now','-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days')),
  ('demo-around-4', 'sample-ana', 1, date('now','-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day')),
  ('demo-around-4', 'sample-tom', 1, date('now','-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 days')),
  ('demo-around-4', 'sample-lea', 2, date('now','-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 days'));
