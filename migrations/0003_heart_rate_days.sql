CREATE TABLE heart_rate_days (
  google_sub TEXT NOT NULL REFERENCES google_connection(google_sub) ON DELETE CASCADE,
  date TEXT NOT NULL, zone TEXT NOT NULL, start_utc TEXT NOT NULL, end_utc TEXT NOT NULL,
  means TEXT NOT NULL, requested_at INTEGER NOT NULL, synced_at INTEGER NOT NULL,
  PRIMARY KEY (google_sub,date,zone)
);
