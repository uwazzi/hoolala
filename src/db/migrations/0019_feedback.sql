-- Say-hi feedback: what the person saw and the log behind it, for product monitoring.
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  first_name TEXT,
  screen TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  log_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);
