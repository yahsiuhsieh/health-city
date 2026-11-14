import { createRemoteJWKSet, customFetch, jwtVerify } from "jose";
export const HEALTH_SCOPES = [
  "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
  "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
  "https://www.googleapis.com/auth/googlehealth.sleep.readonly"];
export const GOOGLE_SCOPES = `openid email ${HEALTH_SCOPES.join(" ")}`;
export function hasHealthScopes(scope: string): boolean {
  const granted = new Set(scope.split(/\s+/));
  return HEALTH_SCOPES.every((required) => granted.has(required));
}
export type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string };

export function authorizationUrl(config: GoogleConfig, state: string, challenge: string, nonce: string, needsConsent: boolean): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId, redirect_uri: config.redirectUri, response_type: "code",
    scope: GOOGLE_SCOPES, state, nonce, code_challenge: challenge, code_challenge_method: "S256",
    access_type: "offline", include_granted_scopes: "false",
    prompt: needsConsent ? "consent select_account" : "select_account",
  }).toString();
  return url.toString();
}

export function createGoogleClient(fetcher: typeof fetch = fetch) {
  const keys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), {
    [customFetch]: fetcher, timeoutDuration: 10_000,
  });
  return {
    async refresh(refreshToken: string, config: Pick<GoogleConfig, "clientId" | "clientSecret">): Promise<string> {
      const response = await fetcher("https://oauth2.googleapis.com/token", {
        method: "POST", redirect: "manual", signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token", refresh_token: refreshToken,
          client_id: config.clientId, client_secret: config.clientSecret,
        }),
      });
      if (!response.ok) throw new Error("Google authorization could not be renewed.");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object") throw new Error("Invalid Google access token response.");
      const token = data as Record<string, unknown>;
      if (typeof token.access_token !== "string" || !/^[A-Za-z0-9._~+/-]+=*$/.test(token.access_token) ||
          token.token_type !== "Bearer" || !Number.isSafeInteger(token.expires_in) || (token.expires_in as number) <= 0 ||
          (token.scope !== undefined && (typeof token.scope !== "string" || !hasHealthScopes(token.scope)))) {
        throw new Error("Invalid Google access token response.");
      }
      return token.access_token;
    },
    async revoke(token: string): Promise<void> {
      const response = await fetcher("https://oauth2.googleapis.com/revoke", {
        method: "POST", redirect: "manual", signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
      });
      if (response.status === 200) return;
      if (response.status === 400) {
        const error: unknown = await response.json().catch(() => null);
        if (error && typeof error === "object" && "error" in error && error.error === "invalid_token") return;
      }
      throw new Error("Google authorization could not be revoked.");
    },
    async exchange(code: string, verifier: string, nonce: string, config: GoogleConfig, clock: () => number) {
      const response = await fetcher("https://oauth2.googleapis.com/token", {
        method: "POST", redirect: "manual", signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code", code, code_verifier: verifier,
          client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri,
        }),
      });
      if (!response.ok) throw new Error("Google token exchange failed.");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object") throw new Error("Invalid Google token response.");
      const token = data as Record<string, unknown>;
      if (typeof token.id_token !== "string" || typeof token.scope !== "string" ||
          typeof token.access_token !== "string" || token.token_type !== "Bearer") {
        throw new Error("Invalid Google token response.");
      }
      if (!hasHealthScopes(token.scope)) throw new Error("Required Google authorization is missing.");
      const { payload } = await jwtVerify(token.id_token, keys, {
        issuer: ["https://accounts.google.com", "accounts.google.com"], audience: config.clientId,
        algorithms: ["RS256"], currentDate: new Date(clock()), maxTokenAge: "10m", clockTolerance: 30,
        requiredClaims: ["sub", "email", "email_verified", "nonce", "iat", "exp"],
      });
      if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true ||
          payload.nonce !== nonce || (payload.azp !== undefined && payload.azp !== config.clientId) ||
          (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== config.clientId)) {
        throw new Error("Google identity validation failed.");
      }
      if (token.refresh_token !== undefined && (typeof token.refresh_token !== "string" || !token.refresh_token)) {
        throw new Error("Invalid Google refresh token.");
      }
      const lifetime = token.refresh_token_expires_in;
      if (lifetime !== undefined && (typeof lifetime !== "number" || !Number.isSafeInteger(lifetime) || lifetime <= 0 || lifetime > 10 * 365 * 86400)) {
        throw new Error("Invalid Google refresh-token expiry.");
      }
      return {
        subject: payload.sub, email: payload.email.toLowerCase(),
        refreshToken: token.refresh_token as string | undefined,
        refreshExpiresAt: typeof lifetime === "number" ? clock() + lifetime * 1000 : null,
        scope: token.scope,
      };
    },
  };
}
