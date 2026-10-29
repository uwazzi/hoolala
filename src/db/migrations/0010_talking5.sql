-- WP32 v6.1: the talking rating becomes the 5 design words (1 mostly quiet
-- to 5 very chatty), one rating per person per place per 7 days. The week
-- backfill uses Monday-based weeks; new rows use the ISO week key from
-- weekKey(), which only differs at year boundaries for these old rows.
CREATE TABLE place_ratings_new (
  place_id TEXT NOT NULL REFERENCES places(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  value INTEGER NOT NULL CHECK (value IN (1, 2, 3, 4, 5)),
  visit_date TEXT NOT NULL,
  week TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (place_id, user_id, week)
);
INSERT INTO place_ratings_new
  SELECT place_id, user_id, value, visit_date, strftime('%Y-W%W', visit_date), created_at FROM place_ratings;
DROP TABLE place_ratings;
ALTER TABLE place_ratings_new RENAME TO place_ratings;
CREATE INDEX idx_place_ratings_place ON place_ratings(place_id, visit_date);
