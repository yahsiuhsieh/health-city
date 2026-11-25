CREATE TABLE rhr_days (
  google_sub TEXT NOT NULL REFERENCES google_connection(google_sub) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready', 'none')),
  records TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (google_sub, date)
);

CREATE TABLE hrv_days (
  google_sub TEXT NOT NULL REFERENCES google_connection(google_sub) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ready', 'none')),
  rmssd_ms REAL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (google_sub, date)
);

CREATE TABLE step_days (
  google_sub TEXT NOT NULL REFERENCES google_connection(google_sub) ON DELETE CASCADE,
  date TEXT NOT NULL,
  zone TEXT NOT NULL,
  start_utc TEXT NOT NULL,
  end_utc TEXT NOT NULL,
  totals TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (google_sub, date, zone)
);

CREATE TABLE energy_days (
  google_sub TEXT NOT NULL REFERENCES google_connection(google_sub) ON DELETE CASCADE,
  date TEXT NOT NULL,
  zone TEXT NOT NULL,
  start_utc TEXT NOT NULL,
  end_utc TEXT NOT NULL,
  totals TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (google_sub, date, zone)
);

CREATE TABLE sleep_sessions (
  google_sub TEXT NOT NULL REFERENCES google_connection(google_sub) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  start_utc TEXT NOT NULL,
  end_utc TEXT NOT NULL,
  segments TEXT NOT NULL,
  short_awakenings TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (google_sub, session_id)
);

CREATE TABLE sleep_query_days (
  google_sub TEXT NOT NULL REFERENCES google_connection(google_sub) ON DELETE CASCADE,
  date TEXT NOT NULL,
  zone TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (google_sub, date, zone)
);

CREATE INDEX sleep_sessions_end ON sleep_sessions(google_sub, end_utc);
