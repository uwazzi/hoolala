-- WP38: today's try is the try the person last picked or drew. picked_at
-- keeps used-up tracking; this pointer is the current one (two picks can
-- share a millisecond).
ALTER TABLE users ADD COLUMN current_game_try_id TEXT;
