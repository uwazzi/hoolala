-- Poster scans: one generic QR for coffee machines. Scans count per day
-- and GPS zone so hotspot places can be tracked. Counts only: no user
-- ids, no exact positions, no timestamps.
CREATE TABLE poster_scans (
  day TEXT NOT NULL,
  zone TEXT NOT NULL,
  locality TEXT,
  scans INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, zone)
);
