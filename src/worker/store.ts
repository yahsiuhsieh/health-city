import type { D1Database } from "@cloudflare/workers-types";

export const IDLE_MS = 30 * 60 * 1000;
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const FLOW_MS = 10 * 60 * 1000;

export type Flow = { pkce_verifier: string; oidc_nonce: string };
export type Connection = {
  google_sub: string;
  refresh_ciphertext: string;
  refresh_expires_at: number | null;
  granted_scope: string;
};

export class AuthStore {
  constructor(private db: D1Database) {}

  async cleanup(now: number): Promise<void> {
    await this.db.batch([
      this.db.prepare("DELETE FROM oauth_flows WHERE expires_at <= ?").bind(now),
      this.db.prepare("DELETE FROM sessions WHERE created_at <= ? OR last_active_at <= ?").bind(now - SESSION_MS, now - IDLE_MS),
    ]);
  }

  async begin(stateHash: string, browserHash: string, verifier: string, nonce: string, now: number): Promise<boolean> {
    const results = await this.db.batch([
      this.db.prepare("DELETE FROM oauth_flows WHERE browser_hash = ?").bind(browserHash),
      this.db.prepare(`INSERT INTO oauth_flows (state_hash, browser_hash, pkce_verifier, oidc_nonce, expires_at)
        SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM oauth_flows) < 16`)
        .bind(stateHash, browserHash, verifier, nonce, now + FLOW_MS),
    ]);
    return results[1]!.meta.changes === 1;
  }

  consume(stateHash: string, browserHash: string, now: number): Promise<Flow | null> {
    // Claim once, then retain the flow until persistence finishes or clearing cancels it.
    return this.db.prepare(`UPDATE oauth_flows SET claimed = 1
      WHERE state_hash = ? AND browser_hash = ? AND expires_at > ? AND claimed = 0
      RETURNING pkce_verifier, oidc_nonce`).bind(stateHash, browserHash, now).first<Flow>();
  }

  connection(): Promise<Connection | null> {
    return this.db.prepare("SELECT google_sub, refresh_ciphertext, refresh_expires_at, granted_scope FROM google_connection WHERE id = 1").first<Connection>();
  }

  async signIn(connection: Connection, sessionHash: string, now: number, stateHash: string): Promise<boolean> {
    const results = await this.db.batch([
      this.db.prepare(`INSERT INTO google_connection (id, google_sub, refresh_ciphertext, refresh_expires_at, granted_scope)
        SELECT 1, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM oauth_flows WHERE state_hash = ? AND claimed = 1 AND expires_at > ?)
        ON CONFLICT(id) DO UPDATE SET
        refresh_ciphertext = excluded.refresh_ciphertext, refresh_expires_at = excluded.refresh_expires_at,
        granted_scope = excluded.granted_scope WHERE google_connection.google_sub = excluded.google_sub`)
        .bind(connection.google_sub, connection.refresh_ciphertext, connection.refresh_expires_at, connection.granted_scope, stateHash, now),
      this.db.prepare(`INSERT INTO sessions (id_hash, google_sub, created_at, last_active_at)
        SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM oauth_flows WHERE state_hash = ? AND claimed = 1 AND expires_at > ?)`)
        .bind(sessionHash, connection.google_sub, now, now, stateHash, now),
      this.db.prepare("DELETE FROM oauth_flows WHERE state_hash = ?").bind(stateHash),
    ]);
    return results[1]!.meta.changes === 1;
  }

  async discardFlow(stateHash: string): Promise<void> {
    await this.db.prepare("DELETE FROM oauth_flows WHERE state_hash = ? AND claimed = 1").bind(stateHash).run();
  }

  async clear(): Promise<void> {
    await this.db.batch([
      this.db.prepare("DELETE FROM oauth_flows"),
      this.db.prepare("DELETE FROM sessions"),
      this.db.prepare("DELETE FROM google_connection"),
    ]);
  }

  async session(sessionHash: string, now: number): Promise<boolean> {
    const row = await this.db.prepare(`SELECT sessions.id_hash FROM sessions
      JOIN google_connection ON sessions.google_sub = google_connection.google_sub
      WHERE sessions.id_hash = ? AND sessions.created_at > ? AND sessions.last_active_at > ?`)
      .bind(sessionHash, now - SESSION_MS, now - IDLE_MS).first();
    return row !== null;
  }

  async activity(sessionHash: string, now: number): Promise<boolean> {
    const row = await this.db.prepare(`UPDATE sessions SET last_active_at = ?
      WHERE id_hash = ? AND created_at > ? AND last_active_at > ? RETURNING id_hash`)
      .bind(now, sessionHash, now - SESSION_MS, now - IDLE_MS).first();
    return row !== null;
  }

  async logout(sessionHash: string): Promise<void> {
    await this.db.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(sessionHash).run();
  }
}
