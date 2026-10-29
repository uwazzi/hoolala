-- v6.2 onboarding story (WP35): first-open flag on the account.
ALTER TABLE users ADD COLUMN intro_seen_at TEXT NULL;
