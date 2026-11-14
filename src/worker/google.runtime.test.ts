import { beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { GOOGLE_SCOPES } from "./google.ts";

let script: string;
let privateKey: CryptoKey;
let publicKey: Record<string, unknown>;

beforeAll(async () => {
  const key = await generateKeyPair("RS256");
  privateKey = key.privateKey;
  publicKey = { ...await exportJWK(key.publicKey), kid: "runtime-test", alg: "RS256", use: "sig" };
  const output = await build({
    stdin: {
      resolveDir: process.cwd(),
      contents: `
        import { createGoogleClient } from './src/worker/google.ts';
        import { createGoogleHealthClient } from './src/worker/google-health.ts';
        import { dayWindow } from './src/worker/health-data.ts';
        const google = createGoogleClient();
        export default { async fetch(request) {
          try {
            const path = new URL(request.url).pathname;
            if (path === '/revoke') {
              await google.revoke('synthetic-refresh');
              return Response.json({ revoked: true });
            }
            if (path === '/refresh' || path === '/health-check') {
              const access = await google.refresh('synthetic-refresh', { clientId: 'test-client', clientSecret: 'synthetic-secret' });
              if (path === '/refresh') return Response.json({ refreshed: true });
              const health = createGoogleHealthClient();
              await health.checkIdentity(access);
              const range = dayWindow('2026-11-08', 'America/Chicago');
              const result = await health.inspectAll(access, range);
              if (result.checks.some(check => check.state === 'failed')) throw new Error('Check failed.');
              return Response.json({ beatsPerMinute: result.checks[0].data.tables[0].rows[0][1] });
            }
            const identity = await google.exchange('synthetic-code', 'synthetic-verifier', 'synthetic-nonce', {
              clientId: 'test-client', clientSecret: 'synthetic-secret',
              redirectUri: 'https://healthcity.test/auth/google/callback',
            }, Date.now);
            return Response.json({ subject: identity.subject });
          } catch { return Response.json({ failed: true }, { status: 500 }); }
        } };
      `,
    },
    bundle: true, write: false, format: "esm", platform: "browser", target: "es2022",
  });
  script = output.outputFiles[0]!.text;
});

describe("Google OAuth in the Workers runtime", () => {
  it.each([["/", false], ["/", true], ["/revoke", false], ["/revoke", true],
    ["/refresh", false], ["/refresh", true], ["/health-check", false], ["/health-check", true]] as const)("handles %s with redirect=%s without external network access", async (path, redirect) => {
    const destinations: string[] = [];
    const runtime = new Miniflare({
      ...convertV4MiniflareOptions({
        host: "127.0.0.1", port: 0, cf: false, modules: true,
        compatibilityDate: "2026-11-09", script,
        outboundService: async (request) => {
          destinations.push(request.url);
          if (request.url.startsWith("https://health.googleapis.com/")) {
            expect(request.headers.get("Authorization")).toBe("Bearer synthetic-access");
            if (request.url.endsWith("/identity")) return Response.json({ healthUserId: "synthetic-health-user" });
            const kind = new URL(request.url).pathname.split("/")[5];
            if (kind === "total-calories") {
              expect(request.method).toBe("POST");
              expect(await request.json()).toMatchObject({ range: { startTime: "2026-11-08T06:00:00Z", endTime: "2026-11-09T06:00:00Z" }, windowSize: "300s" });
            } else expect(request.method).toBe("GET");
            if (redirect) return new Response(null, { status: 302, headers: { Location: "https://unexpected.test/" } });
            if (kind !== "daily-resting-heart-rate") return Response.json({});
            expect(new URL(request.url).searchParams.get("filter"))
              .toBe('daily_resting_heart_rate.date >= "2026-11-08" AND daily_resting_heart_rate.date < "2026-11-09"');
            return Response.json({ dataPoints: [{ dailyRestingHeartRate: {
              date: { year: 2026, month: 11, day: 8 }, beatsPerMinute: "61",
            } }] });
          }
          if (request.url === "https://oauth2.googleapis.com/revoke") {
            expect(request.method).toBe("POST");
            expect(new URLSearchParams(await request.text()).get("token")).toBe("synthetic-refresh");
            return new Response(null, { status: redirect ? 302 : 200,
              headers: redirect ? { Location: "https://unexpected.test/" } : {} });
          }
          if (request.url === "https://www.googleapis.com/oauth2/v3/certs") return Response.json({ keys: [publicKey] });
          if (request.url !== "https://oauth2.googleapis.com/token") throw new Error("Unexpected test destination.");
          if (redirect && path !== "/health-check") return new Response(null, { status: 302, headers: { Location: "https://unexpected.test/" } });
          const form = new URLSearchParams(await request.text());
          if (path === "/refresh" || path === "/health-check") {
            expect(form.get("grant_type")).toBe("refresh_token");
            expect(form.get("refresh_token")).toBe("synthetic-refresh");
            return Response.json({ access_token: "synthetic-access", token_type: "Bearer", expires_in: 3600 });
          }
          expect(form.get("code_verifier")).toBe("synthetic-verifier");
          const seconds = Math.floor(Date.now() / 1000);
          const token = await new SignJWT({
            iss: "https://accounts.google.com", aud: "test-client", sub: "test-owner",
            email: "owner@example.test", email_verified: true, nonce: "synthetic-nonce", iat: seconds, exp: seconds + 3600,
          }).setProtectedHeader({ alg: "RS256", kid: "runtime-test" }).sign(privateKey);
          return Response.json({
            id_token: token, access_token: "synthetic-access", refresh_token: "synthetic-refresh",
            token_type: "Bearer", scope: GOOGLE_SCOPES,
          });
        },
      }),
      telemetry: { enabled: false }, enableDevRegistry: false,
    });
    try {
      const response = await runtime.dispatchFetch(`https://healthcity.test${path}`);
      expect(response.status).toBe(redirect ? 500 : 200);
      const result = path === "/revoke" ? { revoked: true } : path === "/refresh" ? { refreshed: true }
        : path === "/health-check" ? { beatsPerMinute: 61 } : { subject: "test-owner" };
      expect(await response.json()).toEqual(redirect ? { failed: true } : result);
      expect(destinations.some((url) => url.startsWith("https://unexpected.test"))).toBe(false);
      expect(destinations).toHaveLength(path === "/health-check" ? 10 : path === "/" && !redirect ? 2 : 1);
    } finally { await runtime.dispose(); }
  });
});
