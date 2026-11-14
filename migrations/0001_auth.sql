CREATE TABLE oauth_flows (
  state_hash TEXT PRIMARY KEY,
  browser_hash TEXT NOT NULL,
  pkce_verifier TEXT NOT NULL,
  oidc_nonce TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX oauth_flows_expiry ON oauth_flows(expires_at);
CREATE UNIQUE INDEX oauth_flows_browser ON oauth_flows(browser_hash);

CREATE TABLE google_connection (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  google_sub TEXT NOT NULL UNIQUE,
  refresh_ciphertext TEXT NOT NULL,
  refresh_expires_at INTEGER,
  granted_scope TEXT NOT NULL
);

CREATE TABLE sessions (
  id_hash TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL REFERENCES google_connection(google_sub) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL
);
CREATE INDEX sessions_created ON sessions(created_at);
CREATE INDEX sessions_activity ON sessions(last_active_at);
