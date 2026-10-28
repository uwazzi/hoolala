-- WP9: a clearly labelled SAMPLE place and person, so a judge alone can try
-- the whole loop. Never counted on the Live page.
ALTER TABLE places ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN is_sample INTEGER NOT NULL DEFAULT 0;
