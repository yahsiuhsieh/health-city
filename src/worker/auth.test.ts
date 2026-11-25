import {summaryDates,summarizeReplay} from "../core/week-summary.ts";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { napSleep, overnightSleep } from "../../tests/fixtures/sleep-replay.ts";
import { parseRecordedReplay, RECORDED_REPLAY_PATH } from "../core/recorded-replay.ts";
import { DAILY_HRV_PATH } from "../core/daily-hrv.ts";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import type { D1Database } from "@cloudflare/workers-types";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { createAuthHandler, SESSION_COOKIE } from "./auth.ts";
import type { Env } from "./auth.ts";
import { createGoogleClient, GOOGLE_SCOPES, HEALTH_SCOPES } from "./google.ts";
import { createGoogleHealthClient } from "./google-health.ts";
import { hash } from "./security.ts";
import { IDLE_MS, SESSION_MS } from "./store.ts";

const origin = "https://healthcity.yahsiu.workers.dev";
const owner = "owner@example.test";
let signingKey: CryptoKey;
let otherKey: CryptoKey;
let jwk: Record<string, unknown>;
const databases: DatabaseSync[] = [];

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  signingKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  jwk = { ...await exportJWK(pair.publicKey), kid: "test-key", alg: "RS256", use: "sig" };
});
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

// This adapter executes the real migration and SQL against in-memory SQLite.
// Only the D1 methods used by AuthStore are implemented here.
function database(withHeartSnapshots: boolean) {
  const sql = new DatabaseSync(":memory:");
  databases.push(sql);
  sql.exec("PRAGMA foreign_keys = ON");
  sql.exec(readFileSync(new URL("../../migrations/0001_auth.sql", import.meta.url), "utf8"));
  sql.exec(readFileSync(new URL("../../migrations/0002_claimed_oauth_flows.sql", import.meta.url), "utf8"));
  if (withHeartSnapshots) {
    sql.exec(readFileSync(new URL("../../migrations/0003_heart_rate_days.sql", import.meta.url), "utf8"));
  }
  function prepare(query: string) {
    let values: (string | number | null)[] = [];
    const statement = {
      bind(...parameters: (string | number | null)[]) { values = parameters; return statement; },
      async first() { return sql.prepare(query).get(...values) ?? null; },
      async run() {
        const results = sql.prepare(query).all(...values);
        return { results, meta: { changes: Number(sql.prepare("SELECT changes() AS n").get()!.n) } };
      },
    };
    return statement;
  }
  const db = {
    prepare,
    async batch(statements: ReturnType<typeof prepare>[]) {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sql.exec("COMMIT");
        return results;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  return { db, sql };
}

function fixture({withHeartSnapshots = true} = {}) {
  const { db, sql } = database(withHeartSnapshots);
  const state = {
    now: Date.UTC(2026, 10, 9, 18), nonce: "", challenge: "",
    claims: {} as Record<string, unknown>, tokenFields: {} as Record<string, unknown>,
    badSignature: false, providerFailure: false, revokeStatus: 200, revokeError: "", beforeToken: undefined as (() => Promise<void>) | undefined,
    refreshStatus: 200, beforeHealth: undefined as (() => Promise<void>) | undefined,
    sleepStatus: 200, sleepResponse: {} as Record<string, unknown>,
    heartResponse: {} as Record<string, unknown>,dailyHrvResponse: {} as Record<string, unknown>,
  };
  const env: Env = {
    DB: db, APP_ORIGIN: origin, GOOGLE_CLIENT_ID: "test-client", GOOGLE_CLIENT_SECRET: "synthetic-secret",
    OWNER_EMAIL: owner, TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64url"), AUTH_ENABLED: "true",
  };
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://health.googleapis.com/")) {
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer synthetic-access-token");
      if (url.endsWith("/identity")) return Response.json({ healthUserId: "synthetic-health-user" });
      await state.beforeHealth?.();
      if (url.includes("/daily-heart-rate-variability/")) return Response.json(state.dailyHrvResponse);
      if (url.includes("/sleep/")) return Response.json(state.sleepResponse, {status:state.sleepStatus});
      if (url.includes("/heart-rate/")) return Response.json(state.heartResponse);
      if (!url.includes("/daily-resting-heart-rate/")) return Response.json({});
      return Response.json({ dataPoints: ["WITH_SLEEP", "ONLY_WITH_AWAKE_DATA"].map((method) => ({
        dataPointName: "synthetic-source-record",
        dailyRestingHeartRate: { date: { year: 2026, month: 11, day: 8 }, beatsPerMinute: "61",
          dailyRestingHeartRateMetadata: { calculationMethod: method } },
      })) });
    }
    if (url === "https://oauth2.googleapis.com/revoke") {
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("manual");
      expect(new URLSearchParams(String(init?.body)).get("token")).toBe("synthetic-refresh-token");
      return Response.json({ error: state.revokeError }, { status: state.revokeStatus });
    }
    if (url === "https://www.googleapis.com/oauth2/v3/certs") return Response.json({ keys: [jwk] });
    if (url !== "https://oauth2.googleapis.com/token") throw new Error("Unexpected network destination.");
    if (state.providerFailure) return Response.json({ error: "synthetic-private-detail" }, { status: 503 });
    await state.beforeToken?.();
    const body = new URLSearchParams(String(init?.body));
    expect(body.get("client_secret")).toBe("synthetic-secret");
    if (body.get("grant_type") === "refresh_token") {
      expect(body.get("refresh_token")).toBe("synthetic-refresh-token");
      return Response.json(state.refreshStatus === 200
        ? { access_token: "synthetic-access-token", token_type: "Bearer", expires_in: 3600 }
        : { error: "invalid_grant", error_description: "synthetic-private-detail" }, { status: state.refreshStatus });
    }
    expect(body.get("redirect_uri")).toBe(`${origin}/auth/google/callback`);
    expect(await hash(body.get("code_verifier")!)).toBe(state.challenge);
    const seconds = Math.floor(state.now / 1000);
    const idToken = await new SignJWT({
      iss: "https://accounts.google.com", aud: "test-client", sub: "owner-subject", email: owner,
      email_verified: true, nonce: state.nonce, iat: seconds, exp: seconds + 3600, ...state.claims,
    }).setProtectedHeader({ alg: "RS256", kid: "test-key" }).sign(state.badSignature ? otherKey : signingKey);
    return Response.json({
      id_token: idToken, access_token: "synthetic-access-token", token_type: "Bearer",
      refresh_token: "synthetic-refresh-token", refresh_token_expires_in: 604800,
      scope: GOOGLE_SCOPES, ...state.tokenFields,
    });
  });
  const handle = createAuthHandler(createGoogleClient(fetcher), () => state.now, createGoogleHealthClient(fetcher));
  const request = (path: string, method = "GET", cookie = "", requestOrigin: string | null = origin, body?: string) => handle(new Request(`${origin}${path}`, {
    method, body, headers: { Cookie: cookie, ...(requestOrigin === null ? {} : { Origin: requestOrigin }),
      ...(body === undefined ? {} : { "Content-Type": "application/x-www-form-urlencoded" }) },
  }), env);
  async function begin(cookie = "") {
    const response = await request("/auth/google/start", "POST", cookie);
    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("Location")!);
    state.nonce = location.searchParams.get("nonce")!;
    state.challenge = location.searchParams.get("code_challenge")!;
    return {
      state: location.searchParams.get("state")!,
      cookie: response.headers.getSetCookie()[0]!.split(";")[0]!, location,
    };
  }
  const callback = (flow: { state: string; cookie: string }, suffix = "") =>
    request(`/auth/google/callback?state=${flow.state}&code=synthetic-code${suffix}`, "GET", flow.cookie);
  return { state, env, sql, fetcher, request, begin, callback };
}

describe("Google OAuth and owner sessions", () => {
  async function signedIn(f: ReturnType<typeof fixture>) {
    const response = await f.callback(await f.begin());
    return response.headers.getSetCookie().find((value) => value.startsWith(`${SESSION_COOKIE}=`))!.split(";")[0]!;
  }

  it("allows one explicit owner HRV read and returns only normalized data", async () => {
    const f = fixture();
    const cookie = await signedIn(f);
    const body = "date=2026-11-08&timeZone=America%2FChicago";
    f.fetcher.mockClear();
    expect((await f.request(DAILY_HRV_PATH, "POST", cookie, origin, body)).status).toBe(503);
    f.env.GOOGLE_HRV_REPLAY_ENABLED = "true";
    expect((await f.request(DAILY_HRV_PATH, "POST", "", origin, body)).status).toBe(401);
    expect((await f.request(DAILY_HRV_PATH, "POST", cookie, "https://other.test", body)).status).toBe(403);
    expect((await f.request(DAILY_HRV_PATH, "POST", cookie, origin, "date=2026-11-09&timeZone=UTC")).status).toBe(400);
    expect(f.fetcher).not.toHaveBeenCalled();
    f.state.dailyHrvResponse = { dataPoints: [{ dataPointName: "private-vendor-id",
      dailyHeartRateVariability: { date: { year: 2026, month: 11, day: 8 }, averageHeartRateVariabilityMilliseconds: 103.71 },
    }] };
    const response = await f.request(DAILY_HRV_PATH, "POST", cookie, origin, body);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      hrv: { source: "google-health", date: "2026-11-08", rmssdMs: 103.71 }, googleHealthEnabled: true,
    });
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    const query = new URL(String(f.fetcher.mock.calls[1]![0]));
    expect(query.pathname).toBe("/v4/users/me/dataTypes/daily-heart-rate-variability/dataPoints:reconcile");
    expect(query.searchParams.get("filter")).toBe('daily_heart_rate_variability.date >= "2026-11-08" AND daily_heart_rate_variability.date < "2026-11-09"');
    expect(f.sql.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(table => table.name).sort())
      .toEqual(["google_connection", "heart_rate_days", "oauth_flows", "sessions"]);
  });

  it("protects the recorded replay and preserves other streams if one stream fails", async () => {
    const f = fixture();
    const cookie = await signedIn(f);
    const body = "date=2026-11-08&timeZone=America%2FChicago";
    f.fetcher.mockClear();
    expect((await f.request(RECORDED_REPLAY_PATH, "POST", cookie, origin, body)).status).toBe(503);
    f.env.GOOGLE_HRV_REPLAY_ENABLED = "true";
    expect((await f.request(RECORDED_REPLAY_PATH, "POST", "", origin, body)).status).toBe(401);
    expect((await f.request(RECORDED_REPLAY_PATH, "POST", cookie, "https://other.test", body)).status).toBe(403);
    expect(f.fetcher).not.toHaveBeenCalled();
    f.state.dailyHrvResponse = { dataPoints: null };
    const response = await f.request(RECORDED_REPLAY_PATH, "POST", cookie, origin, body);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      date: "2026-11-08", timeZone: "America/Chicago", hrv: { status: "failed" },
      rhr: { status: "ready", value: ["WITH_SLEEP", "ONLY_WITH_AWAKE_DATA"].map(method => ({ bpm: 61, method })) },
      heartRate: { status:"ready",value:Array(288).fill(null) }, cachedHeartRate:false,
      calories: { status: "ready", value: Array(288).fill(null) },
      steps: { status: "ready", value: Array(288).fill(null) },
      sleep: { status: "ready", value: [] },
    });
    expect(f.fetcher).toHaveBeenCalledTimes(7);
  });

  it("reads one range per metric and uses the same stored daily values for both endpoints",async()=>{
    const f=fixture(),cookie=await signedIn(f);
    f.env.GOOGLE_HRV_REPLAY_ENABLED="true";
    f.sql.exec(readFileSync(new URL("../../migrations/0005_metric_history.sql",import.meta.url),"utf8"));
    const body="date=2026-11-08&timeZone=America%2FChicago";
    f.fetcher.mockClear();
    const response=await f.request("/api/summary/week","POST",cookie,origin,body);
    expect(response.status).toBe(200);
    const week=await response.json() as {days:ReturnType<typeof summarizeReplay>[]};
    expect(week.days.map(d=>d.date)).toEqual(summaryDates("2026-11-08"));
    expect(week.days.at(-1)?.rhr).toEqual({status:"value", bpm:61, method:"WITH_SLEEP"});
    expect(f.fetcher).toHaveBeenCalledTimes(7);
    f.fetcher.mockClear();
    const selected=await f.request(RECORDED_REPLAY_PATH,"POST",cookie,origin,body);
    const day=parseRecordedReplay(await selected.json(),"2026-11-08","America/Chicago",86400);
    expect(day).not.toBeNull();
    expect(summarizeReplay(day!)).toEqual(week.days.at(-1));
    expect(f.fetcher).not.toHaveBeenCalled();
  });

  it("delivers normalized sleep and keeps the other streams usable if sleep fails", async () => {
    const f = fixture(), cookie = await signedIn(f);
    f.env.GOOGLE_HRV_REPLAY_ENABLED = "true";
    const date = "2026-11-08", timeZone = "America/Chicago";
    const body = new URLSearchParams({date,timeZone}).toString();
    const read = async () => {
      const response = await f.request(RECORDED_REPLAY_PATH, "POST", cookie, origin, body);
      expect(response.status).toBe(200);
      const payload = await response.json();
      return parseRecordedReplay(payload, date, timeZone, 86400);
    };
    f.state.sleepResponse = {dataPoints:[overnightSleep,napSleep]};
    expect((await read())?.sleep).toMatchObject({status:"ready",value:[{startTime:"2026-11-08T05:00:00Z"},{startTime:"2026-11-08T20:00:00Z"}]});
    f.state.sleepStatus = 503;
    expect(await read()).toMatchObject({sleep:{status:"failed"},steps:{status:"ready"},hrv:{status:"ready"}});
  });

  it.each(["2026-11-04", "2026-11-08"])("returns valid heart rate for %s before the snapshot migration", async date => {
    const f = fixture({withHeartSnapshots:false}), cookie = await signedIn(f);
    f.env.GOOGLE_HRV_REPLAY_ENABLED = "true";
    const timeZone = "America/Chicago", body = new URLSearchParams({date,timeZone}).toString();
    const read = async () => {
      const response = await f.request(RECORDED_REPLAY_PATH, "POST", cookie, origin, body);
      expect(response.status).toBe(200);
      return parseRecordedReplay(await response.json(), date, timeZone, 86400);
    };
    f.state.heartResponse = {rollupDataPoints:[{
      startTime: date + "T06:00:00Z", endTime: date + "T06:05:00Z", heartRate:{beatsPerMinuteAvg:67.381},
    }]};
    expect(await read()).toMatchObject({
      cachedHeartRate:false, heartRate:{status:"ready",value:[67.38,...Array(287).fill(null)]},
    });
    f.state.heartResponse = {rollupDataPoints:null};
    expect(await read()).toMatchObject({cachedHeartRate:false,heartRate:{status:"failed"},steps:{status:"ready"}});
  });

  it("keeps the last complete heart-rate snapshot and applies confirmed corrections and removals",async()=>{
    const f=fixture(),cookie=await signedIn(f);
    f.env.GOOGLE_HRV_REPLAY_ENABLED="true";
    const read=async()=> (await f.request(RECORDED_REPLAY_PATH,"POST",cookie,origin,"date=2026-11-08&timeZone=America%2FChicago")).json() as Promise<{cachedHeartRate:boolean;heartRate:{value:(number|null)[]}}>;
    const point={startTime:"2026-11-08T06:00:00Z",endTime:"2026-11-08T06:05:00Z",heartRate:{beatsPerMinuteAvg:67.381}};
    f.state.heartResponse={rollupDataPoints:[point]};
    expect((await read()).heartRate.value[0]).toBe(67.38);
    f.state.heartResponse={rollupDataPoints:[point],nextPageToken:"repeat"};
    let result=await read();
    expect(result.cachedHeartRate).toBe(true);
    expect(result.heartRate.value[0]).toBe(67.38);
    f.state.refreshStatus=401;
    expect((await read()).heartRate.value[0]).toBe(67.38);
    f.state.refreshStatus=200;
    point.heartRate.beatsPerMinuteAvg=69.87;
    f.state.heartResponse={rollupDataPoints:[point]};
    expect((await read()).heartRate.value[0]).toBe(69.87);
    f.state.heartResponse={};result=await read();
    expect(result.cachedHeartRate).toBe(false);
    expect(result.heartRate.value.every(v=>v===null)).toBe(true);
  });

  it("requires a valid session, same-origin submission, and one real date before health requests", async () => {
    const f = fixture();
    expect((await f.request("/checks/health")).status).toBe(401);
    expect((await f.request("/checks/health/run", "POST", "", origin, "date=2026-11-08&timeZone=UTC")).status).toBe(401);
    const cookie = await signedIn(f);
    f.fetcher.mockClear();
    const form = await f.request("/checks/health", "GET", cookie);
    expect(form.status).toBe(200);
    expect(form.headers.get("Referrer-Policy")).toBe("same-origin");
    expect(form.headers.get("Content-Security-Policy")).toContain("form-action 'self' https://accounts.google.com");
    expect(form.headers.get("Content-Security-Policy")).toContain("connect-src 'self'");
    expect((await f.request("/checks/health/run", "POST", cookie, "https://other.test", "date=2026-11-08&timeZone=UTC")).status).toBe(403);
    for (const body of ["", "date=2026-02-30", "date=2026-11-08&timeZone=UTC&date=2026-11-09", "date=%3Cscript%3E"]) {
      expect((await f.request("/checks/health/run", "POST", cookie, origin, body)).status).toBe(400);
    }
    expect(f.fetcher).not.toHaveBeenCalled();
    f.state.now += IDLE_MS;
    expect((await f.request("/checks/health/run", "POST", cookie, origin, "date=2026-11-08&timeZone=UTC")).status).toBe(401);
    expect(f.fetcher).not.toHaveBeenCalled();
  });

  it("refreshes only for a manual health check and shows separate methods without storing records", async () => {
    const f = fixture();
    const cookie = await signedIn(f);
    const connection = f.sql.prepare("SELECT * FROM google_connection").get();
    f.fetcher.mockClear();
    f.state.now += 5 * 60_000;
    const response = await f.request("/checks/health/run", "POST", cookie, origin, "date=2026-11-08&timeZone=UTC");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const html = await response.text();
    expect(html).toContain("WITH_SLEEP");
    expect(html).toContain("ONLY_WITH_AWAKE_DATA");
    expect(html.match(/<td>61<\/td>/g)).toHaveLength(2);
    for (const hidden of ["synthetic-access-token", "synthetic-refresh-token", "synthetic-health-user", "synthetic-source-record"]) {
      expect(html).not.toContain(hidden);
    }
    expect(f.fetcher.mock.calls).toHaveLength(10);
    expect(f.fetcher.mock.calls.map(([input]) => new URL(String(input)).pathname)).toContain("/v4/users/me/dataTypes/total-calories/dataPoints:rollUp");
    expect(f.sql.prepare("SELECT * FROM google_connection").get()).toEqual(connection);
    expect(f.sql.prepare("SELECT last_active_at FROM sessions").get()!.last_active_at).toBe(f.state.now);
    expect(f.sql.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((table) => table.name).sort())
      .toEqual(["google_connection", "heart_rate_days", "oauth_flows", "sessions"]);
  });

  it("preserves the connection and session when refresh fails without calling the Health API", async () => {
    const f = fixture();
    const cookie = await signedIn(f);
    f.fetcher.mockClear();
    f.state.refreshStatus = 400;
    const response = await f.request("/checks/health/run", "POST", cookie, origin, "date=2026-11-08&timeZone=UTC");
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("synthetic-private-detail");
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect((await f.request("/api/session", "GET", cookie)).status).toBe(200);
    expect(f.sql.prepare("SELECT * FROM google_connection").get()).toBeDefined();
  });

  it("requires renewed consent for an older connection with only the metrics scope", async () => {
    const f = fixture();
    const cookie = await signedIn(f);
    f.sql.prepare("UPDATE google_connection SET granted_scope = ?").run(`openid email ${HEALTH_SCOPES[0]}`);
    f.fetcher.mockClear();
    const response = await f.request("/checks/health/run", "POST", cookie, origin, "date=2026-11-08&timeZone=UTC");
    expect(response.status).toBe(409);
    expect(f.fetcher).not.toHaveBeenCalled();
    const flow = await f.begin();
    expect(flow.location.searchParams.get("prompt")).toBe("consent select_account");
    f.state.tokenFields.refresh_token = undefined;
    expect((await f.callback(flow)).headers.get("Location")).toContain("failed");
    expect(f.sql.prepare("SELECT granted_scope FROM google_connection").get()!.granted_scope).toBe(`openid email ${HEALTH_SCOPES[0]}`);
  });

  it("protects continuation requests and returns aggregates without Google credentials", async () => {
    const f = fixture();
    const cookie = await signedIn(f);
    const body = "date=2026-11-08&timeZone=UTC&stream=heart-rate&pageToken=synthetic-page";
    f.fetcher.mockClear();
    expect((await f.request("/checks/health/run", "POST", "", origin, body)).status).toBe(401);
    expect(f.fetcher).not.toHaveBeenCalled();
    const lastActive = f.sql.prepare("SELECT last_active_at FROM sessions").get()!.last_active_at;
    f.state.now += 60_000;
    const response = await f.request("/checks/health/run", "POST", cookie, origin, body);
    expect(response.status).toBe(200);
    const data = await response.json() as { data: { count: number }; nextPageToken: string };
    expect(data.nextPageToken).toBe("");
    expect(JSON.stringify(data)).not.toContain("synthetic-access-token");
    expect(f.fetcher).toHaveBeenCalledTimes(2);
    expect(f.sql.prepare("SELECT last_active_at FROM sessions").get()!.last_active_at).toBe(lastActive);
  });

  it("does not return health records if disconnection completes during the request", async () => {
    const f = fixture();
    const cookie = await signedIn(f);
    f.state.beforeHealth = async () => {
      expect((await f.request("/auth/disconnect", "POST", cookie, origin, "confirmation=disconnect")).status).toBe(303);
    };
    const response = await f.request("/checks/health/run", "POST", cookie, origin, "date=2026-11-08&timeZone=UTC");
    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toContain('href="/auth/status"');
    expect(body).not.toContain("synthetic-private");
    expect(body).not.toContain("beatsPerMinute");
    expect(f.sql.prepare("SELECT * FROM google_connection").get()).toBeUndefined();
  });

  it("requires an owner session, same-origin POST, and confirmation before clearing", async () => {
    const f = fixture();
    expect((await f.request("/settings/disconnect")).status).toBe(401);
    expect((await f.request("/auth/disconnect", "POST", "", origin, "confirmation=disconnect")).status).toBe(401);
    const cookie = await signedIn(f);
    expect((await f.request("/settings/disconnect", "GET", cookie)).status).toBe(200);
    expect((await f.request("/auth/disconnect", "POST", cookie, "https://example.test", "confirmation=disconnect")).status).toBe(403);
    expect((await f.request("/auth/disconnect", "POST", cookie)).status).toBe(400);
    expect(f.fetcher.mock.calls.filter(([url]) => String(url).endsWith("/revoke"))).toHaveLength(0);
    expect(f.sql.prepare("SELECT * FROM google_connection").get()).toBeDefined();
  });

  it.each([200, 400])("clears app data after revocation or an already invalid token (%s)", async (status) => {
    const f = fixture();
    const cookie = await signedIn(f);
    await f.begin();
    f.state.revokeStatus = status;
    f.state.revokeError = "invalid_token";
    const response = await f.request("/auth/disconnect", "POST", cookie, origin, "confirmation=disconnect");
    expect(response.status).toBe(303);
    expect(response.headers.getSetCookie()).toHaveLength(2);
    for (const table of ["oauth_flows", "sessions", "google_connection"]) expect(f.sql.prepare(`SELECT * FROM ${table}`).get()).toBeUndefined();
    expect((await f.request("/api/session", "GET", cookie)).status).toBe(401);
  });

  it.each([302, 400, 429, 503])("preserves retry capability after revocation failure (%s)", async (status) => {
    const f = fixture();
    const cookie = await signedIn(f);
    f.state.revokeStatus = status;
    f.state.revokeError = "invalid_request";
    expect((await f.request("/auth/disconnect", "POST", cookie, origin, "confirmation=disconnect")).status).toBe(503);
    expect((await f.request("/api/session", "GET", cookie)).status).toBe(200);
    expect(f.sql.prepare("SELECT * FROM google_connection").get()).toBeDefined();
  });

  it("prevents an in-flight callback from restoring a cleared connection", async () => {
    const f = fixture();
    const cookie = await signedIn(f);
    const flow = await f.begin();
    f.state.beforeToken = async () => {
      expect((await f.request("/auth/disconnect", "POST", cookie, origin, "confirmation=disconnect")).status).toBe(303);
    };
    expect((await f.callback(flow)).headers.get("Location")).toContain("failed");
    expect(f.sql.prepare("SELECT * FROM google_connection").get()).toBeUndefined();
    expect(f.sql.prepare("SELECT * FROM sessions").get()).toBeUndefined();
  });

  it("provides a sign-in link for protected pages without changing API responses", async () => {
    const f = fixture();
    for (const path of ["/checks/health", "/settings/disconnect"]) {
      const response = await f.request(path);
      expect(response.status).toBe(401);
      expect(response.headers.get("Content-Type")).toContain("text/html");
      expect(await response.text()).toContain('href="/auth/status"');
    }
    const session = await f.request("/api/session");
    expect(session.status).toBe(401);
    expect(session.headers.get("Content-Type")).toContain("application/json");
  });

  it("uses PKCE, nonce, minimal scopes, and a browser-bound one-use flow", async () => {
    const f = fixture();
    const flow = await f.begin();
    expect(flow.location.origin).toBe("https://accounts.google.com");
    expect(flow.location.searchParams.get("scope")).toBe(GOOGLE_SCOPES);
    expect(flow.location.searchParams.get("code_challenge_method")).toBe("S256");
    const stored = f.sql.prepare("SELECT * FROM oauth_flows").get()!;
    expect(stored.state_hash).not.toBe(flow.state);
    expect(stored.browser_hash).not.toBe(flow.cookie.split("=")[1]);
    const first = await f.callback(flow);
    expect(first.headers.get("Location")).toBe("/auth/status");
    const cookie = first.headers.getSetCookie().find((item) => item.startsWith(`${SESSION_COOKIE}=`))!;
    expect(cookie).toContain("Secure; HttpOnly; SameSite=Lax");
    const sessionCookie = cookie.split(";")[0]!;
    expect(f.sql.prepare("SELECT id_hash FROM sessions").get()!.id_hash).not.toBe(sessionCookie.split("=")[1]);
    const connection = f.sql.prepare("SELECT * FROM google_connection").get()!;
    expect(connection.refresh_ciphertext).not.toContain("synthetic-refresh-token");
    const [, iv, ciphertext] = String(connection.refresh_ciphertext).split(".");
    const key = await crypto.subtle.importKey("raw", Buffer.alloc(32, 7), "AES-GCM", false, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(iv!, "base64url"),
      additionalData: new TextEncoder().encode("test-client:owner-subject") }, key, Buffer.from(ciphertext!, "base64url"));
    expect(new TextDecoder().decode(decrypted)).toBe("synthetic-refresh-token");
    expect(f.sql.prepare("SELECT * FROM oauth_flows").get()).toBeUndefined();
    expect((await f.request("/api/session", "GET", sessionCookie)).status).toBe(200);
    expect((await f.callback(flow)).headers.get("Location")).toBe("/auth/status?result=failed");
    expect(f.fetcher.mock.calls.filter(([url]) => String(url).endsWith("/token"))).toHaveLength(1);
  });

  it("rejects wrong-browser, duplicate-state, expired, and concurrent repeated callbacks", async () => {
    const f = fixture();
    const flow = await f.begin();
    expect((await f.callback({ ...flow, cookie: "" })).headers.get("Location")).toContain("failed");
    expect((await f.callback(flow, `&state=${flow.state}`)).headers.get("Location")).toContain("failed");
    expect(f.fetcher).not.toHaveBeenCalled();
    const responses = await Promise.all([f.callback(flow), f.callback(flow)]);
    expect(responses.filter((r) => r.headers.get("Location") === "/auth/status")).toHaveLength(1);
    const expired = await f.begin();
    f.state.now += 600_000;
    expect((await f.callback(expired)).headers.get("Location")).toContain("failed");
  });

  it("handles denial without token requests or reflecting provider details", async () => {
    const f = fixture();
    const flow = await f.begin();
    const response = await f.request(`/auth/google/callback?state=${flow.state}&error=access_denied&error_description=private-detail`, "GET", flow.cookie);
    expect(response.headers.get("Location")).toBe("/auth/status?result=denied");
    expect(await response.text()).toBe("");
    expect(f.fetcher).not.toHaveBeenCalled();
    expect(f.sql.prepare("SELECT * FROM oauth_flows").get()).toBeUndefined();
  });

  it.each([
    ["another account", { email: "other@example.test" }],
    ["unverified email", { email_verified: false }],
    ["wrong audience", { aud: "another-client" }],
    ["wrong issuer", { iss: "https://example.test" }],
    ["wrong nonce", { nonce: "another-nonce" }],
    ["expired token", { exp: 1 }],
    ["wrong authorized party", { azp: "another-client" }],
  ])("rejects %s without saving a connection", async (_label, claims) => {
    const f = fixture();
    f.state.claims = claims;
    expect((await f.callback(await f.begin())).headers.get("Location")).toContain("failed");
    expect(f.sql.prepare("SELECT * FROM google_connection").get()).toBeUndefined();
    expect(f.sql.prepare("SELECT * FROM sessions").get()).toBeUndefined();
  });

  it("rejects a forged signature and missing health permission", async () => {
    const f = fixture();
    f.state.badSignature = true;
    expect((await f.callback(await f.begin())).headers.get("Location")).toContain("failed");
    f.state.badSignature = false;
    f.state.tokenFields.scope = "openid email";
    expect((await f.callback(await f.begin())).headers.get("Location")).toContain("failed");
    expect(f.sql.prepare("SELECT * FROM sessions").get()).toBeUndefined();
  });

  it.each(HEALTH_SCOPES)("requires the requested read-only scope %s", async (missing) => {
    const f = fixture();
    f.state.tokenFields.scope = `openid email ${HEALTH_SCOPES.filter((scope) => scope !== missing).join(" ")}`;
    expect((await f.callback(await f.begin())).headers.get("Location")).toContain("failed");
    expect(f.sql.prepare("SELECT * FROM google_connection").get()).toBeUndefined();
  });

  it("preserves existing refresh credentials on repeat sign-in and pins the subject", async () => {
    const f = fixture();
    await f.callback(await f.begin());
    const original = f.sql.prepare("SELECT refresh_ciphertext FROM google_connection").get()!.refresh_ciphertext;
    f.state.tokenFields.refresh_token = undefined;
    f.state.tokenFields.refresh_token_expires_in = undefined;
    const flow = await f.begin();
    expect(flow.location.searchParams.get("prompt")).toBe("select_account");
    expect((await f.callback(flow)).headers.get("Location")).toBe("/auth/status");
    expect(f.sql.prepare("SELECT refresh_ciphertext FROM google_connection").get()!.refresh_ciphertext).toBe(original);
    const renewal = await f.request("/auth/google/start", "POST", "", origin, "renew=true");
    expect(new URL(renewal.headers.get("Location")!).searchParams.get("prompt")).toBe("consent select_account");
    f.state.claims.sub = "another-subject";
    expect((await f.callback(await f.begin())).headers.get("Location")).toContain("failed");
    expect(f.sql.prepare("SELECT google_sub FROM google_connection").get()!.google_sub).toBe("owner-subject");
  });

  it("requires a refresh token on the first connection and hides provider failures", async () => {
    const f = fixture();
    f.state.tokenFields.refresh_token = undefined;
    expect((await f.callback(await f.begin())).headers.get("Location")).toContain("failed");
    f.state.providerFailure = true;
    const failure = await f.callback(await f.begin());
    expect(failure.headers.get("Location")).toBe("/auth/status?result=failed");
    expect(await failure.text()).not.toContain("synthetic-private-detail");
    expect(f.sql.prepare("SELECT * FROM google_connection").get()).toBeUndefined();
  });

  it("enforces idle and absolute session expiry without extending sessions on status checks", async () => {
    const f = fixture();
    const response = await f.callback(await f.begin());
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith(`${SESSION_COOKIE}=`))!.split(";")[0]!;
    const created = f.state.now;
    f.state.now += 20 * 60_000;
    expect((await f.request("/api/session", "GET", cookie)).status).toBe(200);
    expect(f.sql.prepare("SELECT last_active_at FROM sessions").get()!.last_active_at).toBe(created);
    expect((await f.request("/api/session/activity", "POST", cookie)).status).toBe(204);
    f.state.now += IDLE_MS;
    expect((await f.request("/api/session", "GET", cookie)).status).toBe(401);
    expect((await f.request("/api/session/activity", "POST", cookie)).status).toBe(401);
    f.state.now = created + SESSION_MS;
    f.sql.prepare("UPDATE sessions SET last_active_at = ?").run(f.state.now - 1000);
    expect((await f.request("/api/session", "GET", cookie)).status).toBe(401);
  });

  it("rejects cross-origin changes and logout preserves the Google connection", async () => {
    const f = fixture();
    expect((await f.request("/auth/google/start", "POST", "", null)).status).toBe(403);
    expect((await f.request("/auth/google/start", "POST", "", "null")).status).toBe(403);
    expect((await f.request("/auth/google/start", "POST", "", "https://example.test")).status).toBe(403);
    const response = await f.callback(await f.begin());
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith(`${SESSION_COOKIE}=`))!.split(";")[0]!;
    expect((await f.request("/auth/logout", "POST", cookie, "https://example.test")).status).toBe(403);
    expect((await f.request("/api/session/activity", "POST", cookie, "https://example.test")).status).toBe(403);
    expect((await f.request("/auth/logout", "POST", cookie)).headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect((await f.request("/api/session", "GET", cookie)).status).toBe(401);
    expect(f.sql.prepare("SELECT google_sub FROM google_connection").get()).toBeDefined();
  });

  it("fails closed before any Google request when disabled or secrets are missing", async () => {
    const f = fixture();
    f.env.AUTH_ENABLED = "false";
    expect((await f.request("/auth/google/start", "POST")).status).toBe(503);
    f.env.AUTH_ENABLED = "true";
    f.env.TOKEN_ENCRYPTION_KEY = "invalid";
    expect((await f.request("/auth/google/start", "POST")).status).toBe(503);
    expect(f.fetcher).not.toHaveBeenCalled();
  });
});
