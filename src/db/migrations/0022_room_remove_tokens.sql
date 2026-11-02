-- WP-A3: each membership gets an opaque token so the starter can remove
-- someone from the room view without ever seeing user ids.
ALTER TABLE room_members ADD COLUMN remove_token TEXT;
UPDATE room_members SET remove_token = lower(hex(randomblob(16))) WHERE remove_token IS NULL;
CREATE UNIQUE INDEX idx_room_members_token ON room_members(remove_token);
