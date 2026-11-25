import {Temporal} from "@js-temporal/polyfill";
import {WEEK_SUMMARY_PATH,summaryDates,summarizeReplay} from "../core/week-summary.ts";
import {historyReplay} from "./metric-history.ts";
import {elapsedSeconds,sleepInstant} from "../core/sleep-replay.ts";
import { readHeartSnapshot,saveHeartSnapshot } from "./heart-snapshot.ts";
import { respond, respondJson } from "./http.ts";
import { RECORDED_REPLAY_PATH } from "../core/recorded-replay.ts";
import type { RecordedReplay, ReplayStream } from "../core/recorded-replay.ts";
import { DAILY_HRV_PATH } from "../core/daily-hrv.ts";
import type { DailyHrvResponse } from "../core/daily-hrv.ts";
import type { D1Database } from "@cloudflare/workers-types";
import { authorizationUrl, createGoogleClient, hasHealthScopes } from "./google.ts";
import { createGoogleHealthClient, HealthCheckError, isInspectionStream } from "./google-health.ts";
import type { HealthInspection } from "./google-health.ts";
import { dayWindow } from "./health-data.ts";
import { healthCheckHtml } from "./health-check.ts";
import { AuthStore, FLOW_MS, SESSION_MS } from "./store.ts";
import type { Connection } from "./store.ts";
import { encryptionKeyBytes, encryptRefreshToken, decryptRefreshToken, hash, randomToken, readCookie, secureCookie } from "./security.ts";

export interface Env {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  DB?: D1Database;
  APP_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  OWNER_EMAIL?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  AUTH_ENABLED?: string;
  GOOGLE_HRV_REPLAY_ENABLED?: string;
}

const FLOW_COOKIE = "__Host-hc_oauth";
export const SESSION_COOKIE = "__Host-hc_session";

function configFor(env: Env) {
  if (env.AUTH_ENABLED !== "true" || !env.DB || !env.APP_ORIGIN || !env.GOOGLE_CLIENT_ID ||
      !env.GOOGLE_CLIENT_SECRET || !env.OWNER_EMAIL || !env.TOKEN_ENCRYPTION_KEY) return null;
  try {
    const origin = new URL(env.APP_ORIGIN);
    if (origin.protocol !== "https:" || origin.origin !== env.APP_ORIGIN) return null;
    encryptionKeyBytes(env.TOKEN_ENCRYPTION_KEY);
    return {
      db: env.DB, origin: env.APP_ORIGIN, clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET, owner: env.OWNER_EMAIL.trim().toLowerCase(),
      encryptionKey: env.TOKEN_ENCRYPTION_KEY,
      redirectUri: `${env.APP_ORIGIN}/auth/google/callback`,
    };
  } catch {
    return null;
  }
}

function redirect(result?: "failed" | "denied"): Response {
  return respond(null, 303, {
    Location: `/auth/status${result ? `?result=${result}` : ""}`,
    "Set-Cookie": secureCookie(FLOW_COOKIE, "", 0),
  });
}

function page(configured: boolean, signedIn: boolean, result: string | null): Response {
  const message = !configured ? "Google sign-in is not available yet."
    : signedIn ? "You are signed in. Google authorization is saved. Run a manual check to inspect health data."
    : result === "denied" ? "Google authorization was declined."
    : result === "failed" ? "Sign-in could not be completed. Please try again."
    : "Sign in to your private HealthCity account.";
  const form = !configured ? "" : signedIn
    ? '<p><a href="/checks/health">Check health data</a></p><form method="post" action="/auth/logout"><button>Sign out</button></form><details><summary>Settings</summary><p><a href="/settings/disconnect">Clear HealthCity Data and Disconnect</a></p></details>'
    : '<p>Google sign-in confirms your identity and requests activity, health metrics, and sleep read-only permissions. Signing in does not retrieve health records.</p><form method="post" action="/auth/google/start"><button>Continue with Google</button></form>';
  return respond(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HealthCity</title><h1>HealthCity</h1><p>${message}</p>${form}</html>`, configured ? 200 : 503,
    {
      "Content-Type": "text/html; charset=utf-8", "Referrer-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'none'; form-action 'self' https://accounts.google.com; base-uri 'none'; frame-ancestors 'none'",
    });
}

function disconnectPage(failed = false): Response {
  return respond(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Disconnect HealthCity</title>
<h1>Clear HealthCity Data and Disconnect</h1>
${failed ? '<p>Disconnect could not be completed. No HealthCity data was cleared. Try again.</p>' : ''}
<p>This clears all HealthCity sessions, pending sign-ins, and the saved Google connection. No health history is stored yet.</p>
<p>Google Health source records stay unchanged. Revocation can remove access for all apps in this Google Cloud project.</p>
<p>Cloudflare recovery backups can retain earlier encrypted records for up to seven days on the Free plan.</p>
<form method="post" action="/auth/disconnect"><input type="hidden" name="confirmation" value="disconnect"><button>Clear HealthCity Data and Disconnect</button></form>
<p><a href="/auth/status">Cancel</a></p></html>`, failed ? 503 : 200,
    { "Content-Type": "text/html; charset=utf-8", "Referrer-Policy": "same-origin" });
}

function signInRequired(): Response {
  return respond(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sign-in required</title>
<h1>Sign-in required</h1><p>Sign in to continue.</p><p><a href="/auth/status">Return to HealthCity sign-in</a></p></html>`, 401,
    { "Content-Type": "text/html; charset=utf-8", "Referrer-Policy": "same-origin" });
}

function healthPage(date = "", timeZone = "", result?: HealthInspection, message?: string, status = 200): Response {
  return respond(healthCheckHtml(date, timeZone, result, message), status,
    {
      "Content-Type": "text/html; charset=utf-8", "Referrer-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'none'; connect-src 'self'; script-src 'self'; style-src 'self'; form-action 'self' https://accounts.google.com; base-uri 'none'; frame-ancestors 'none'",
    });
}

function usableConnection(connection: Connection | null, now: number): connection is Connection {
  return connection !== null && hasHealthScopes(connection.granted_scope) &&
    (connection.refresh_expires_at === null || connection.refresh_expires_at > now);
}

const routes = new Map([
  ["/", "GET"], ["/auth/status", "GET"], ["/api/session", "GET"],
  ["/auth/google/start", "POST"], ["/auth/google/callback", "GET"],
  ["/auth/logout", "POST"], ["/api/session/activity", "POST"],
  ["/settings/disconnect", "GET"], ["/auth/disconnect", "POST"],
  ["/checks/health", "GET"], ["/checks/health/run", "POST"],
  [DAILY_HRV_PATH, "POST"], [RECORDED_REPLAY_PATH, "POST"], [WEEK_SUMMARY_PATH,"POST"],
]);

export function createAuthHandler(google = createGoogleClient(), clock: () => number = Date.now, health = createGoogleHealthClient()) {
  return async (request: Request, env: Env, waitUntil?:(work:Promise<void>)=>void): Promise<Response> => {
    const url = new URL(request.url);
    const method = routes.get(url.pathname);
    if (!method) return respond("Not found.", 404);
    if (request.method !== method) return respond("Method not allowed.", 405, { Allow: method });
    const replayRoute = url.pathname === WEEK_SUMMARY_PATH || url.pathname === DAILY_HRV_PATH || url.pathname === RECORDED_REPLAY_PATH;
    if (replayRoute && env.GOOGLE_HRV_REPLAY_ENABLED !== "true") {
      return respondJson({ error: "replay_disabled" }, 503);
    }
    const isCallback = url.pathname === "/auth/google/callback";
    const config = configFor(env);
    if (!config) {
      if (isCallback) return redirect("failed");
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/auth/status")) return page(false, false, null);
      return respond("Google sign-in is not available yet.", 503);
    }
    if (url.origin !== config.origin) return respond("Request origin rejected.", 403);
    if (request.method === "POST" && request.headers.get("Origin") !== config.origin) return respond("Request origin rejected.", 403);

    const store = new AuthStore(config.db);
    const now = clock();
    const sessionId = readCookie(request, SESSION_COOKIE);
    const sessionHash = sessionId ? await hash(sessionId) : null;
    if (replayRoute) {
      const active = () => sessionHash ? store.session(sessionHash, clock()) : Promise.resolve(false);
      if (!sessionHash || !await active()) return respondJson({ error: "sign_in_required" }, 401);
      if (request.headers.get("Content-Type")?.split(";")[0] !== "application/x-www-form-urlencoded") {
        return respondJson({ error: "invalid_date" }, 400);
      }
      const form = new URLSearchParams(await request.text());
      const dates = form.getAll("date");
      const zones = form.getAll("timeZone");
      const window = dates.length === 1 && zones.length === 1 ? dayWindow(dates[0]!, zones[0]!) : null;
      if (!window || Date.parse(window.end) > now) return respondJson({ error: "invalid_date" }, 400);
      const connection = await store.connection();
      if(connection && (url.pathname===WEEK_SUMMARY_PATH || url.pathname===RECORDED_REPLAY_PATH)){
        if(!await store.activity(sessionHash,clock()))return respondJson({error:"sign_in_required"},401);
        const dates=url.pathname===WEEK_SUMMARY_PATH?summaryDates(window.date):[window.date];
        const windows=dates.map(date=>dayWindow(date,window.timeZone)!);
        let token:Promise<string>|undefined;
        let authorizationFailed=false;
        const access=async()=>{
          if(!usableConnection(connection,now))throw new Error("Authorization required.");
          const refreshToken=await decryptRefreshToken(connection.refresh_ciphertext,config.encryptionKey,connection.google_sub,config.clientId);
          return google.refresh(refreshToken,config);
        };
        try{
          const days=await historyReplay(config.db,connection.google_sub,windows,now,form.get("refresh")==="1",
            async(key,targets)=>health.readMetricRange(key,targets,await (token??=access().catch(e=>{authorizationFailed=true;throw e;})),active),active,waitUntil);
          if(!await active())return respondJson({error:"sign_in_required"},401);
          if(authorizationFailed && days.every(d=>[d.hrv,d.rhr,d.heartRate,d.sleep,d.steps,d.calories].every(s=>s.status==="failed")))
            return usableConnection(connection,now)?respondJson({error:"authorization_failed"},503):respondJson({error:"authorization_required"},409);
          if(url.pathname===WEEK_SUMMARY_PATH)return respondJson({date:window.date,timeZone:window.timeZone,days:days.map(summarizeReplay)});
          const day=days[0]!;
          if(day.sleep.status==="ready")day.sleep.value=day.sleep.value.filter(s=>
            sleepInstant(s,elapsedSeconds(s)).epochNanoseconds>Temporal.Instant.from(window.start).epochNanoseconds);
          return respondJson(day);
        }catch(error){
          // Older local databases can still serve a single day before migration 0005.
          if(url.pathname===WEEK_SUMMARY_PATH || !String(error).includes("no such table"))throw error;
        }
      }
      const cached = async () => {
        if (!connection) return null;
        return readHeartSnapshot(config.db,connection.google_sub,window).catch(()=>null);
      };
      const fallback = async () => {
        if (url.pathname !== RECORDED_REPLAY_PATH) return null;
        const means = await cached();
        if (!means || !await active()) return null;
        const failed = {status:"failed"};
        return respondJson({date:window.date,timeZone:window.timeZone,rhr:failed,hrv:failed,steps:failed,calories:failed,sleep:failed,
          cachedHeartRate:true,heartRate:{status:"ready",value:means}});
      };
      if (!usableConnection(connection, now)) return await fallback() ?? respondJson({ error: "authorization_required" }, 409);
      if (!await store.activity(sessionHash, clock())) return respondJson({ error: "sign_in_required" }, 401);
      let accessToken: string;
      try {
        const refreshToken = await decryptRefreshToken(connection.refresh_ciphertext, config.encryptionKey, connection.google_sub, config.clientId);
        accessToken = await google.refresh(refreshToken, config);
      } catch {
        return await fallback() ?? respondJson({ error: "authorization_failed" }, 503);
      }
      if (url.pathname === RECORDED_REPLAY_PATH) {
        const [hrv, calories, steps, heart, sleep, rhr] = await Promise.allSettled([
          health.readDailyHrv(accessToken, window, active),
          health.readReplayActivity("total-calories", accessToken, window, active),
          health.readReplayActivity("steps", accessToken, window, active),
          health.readReplayActivity("heart-rate", accessToken, window, active),
          health.readReplaySleep(accessToken, window, active),
          health.readDailyRhr(accessToken, window, active),
        ]);
        if (!await active()) return respondJson({ error: "sign_in_required" }, 401);
        const stream = <T>(result: PromiseSettledResult<T>): ReplayStream<T> =>
          result.status === "fulfilled" ? { status: "ready", value: result.value } : { status: "failed" };
        let heartRate = stream(heart);
        let cachedHeartRate = false;
        if (heartRate.status === "ready") {
          try {
            await saveHeartSnapshot(config.db,connection.google_sub,window,heartRate.value,now,clock());
          } catch {
            // Keep the current Google Health values if D1 cannot save the snapshot.
          }
        }
        if (heartRate.status==="failed") {
          const means = await cached();
          if (means) { heartRate={status:"ready",value:means}; cachedHeartRate=true; }
        }
        const replay: RecordedReplay = {
          date: window.date, timeZone: window.timeZone, heartRate, cachedHeartRate, rhr: stream(rhr), hrv: stream(hrv), calories: stream(calories), steps: stream(steps), sleep: stream(sleep),
        };
        if (!await active()) return respondJson({error:"sign_in_required"},401);
        return respondJson(replay);
      }
      try {
        const rmssdMs = await health.readDailyHrv(accessToken, window, active);
        if (!await active()) return respondJson({ error: "sign_in_required" }, 401);
        const result: DailyHrvResponse = {
          hrv: { source: "google-health", date: window.date, rmssdMs }, googleHealthEnabled: true,
        };
        return respondJson(result);
      } catch {
        if (!await active()) return respondJson({ error: "sign_in_required" }, 401);
        return respondJson({ error: "hrv_read_failed" }, 502);
      }
    }
    if (url.pathname === "/checks/health" || url.pathname === "/checks/health/run") {
      if (!sessionHash || !await store.session(sessionHash, now)) return signInRequired();
      if (url.pathname === "/checks/health") return healthPage();
      if (request.headers.get("Content-Type")?.split(";")[0] !== "application/x-www-form-urlencoded") {
        return healthPage("", "", undefined, "Select one valid source date and IANA time zone.", 400);
      }
      const form = new URLSearchParams(await request.text());
      const date = form.get("date") ?? "";
      const timeZone = form.get("timeZone") ?? "";
      const window = dayWindow(date, timeZone);
      if (form.getAll("date").length !== 1 || form.getAll("timeZone").length !== 1 || !window) {
        return healthPage("", "", undefined, "Select one valid source date and IANA time zone.", 400);
      }
      const connection = await store.connection();
      if (!usableConnection(connection, now)) {
        return healthPage(date, timeZone, undefined, "Google authorization needs renewal. Grant all three read-only permissions below.", 409);
      }
      const continuation = form.get("pageToken");
      if (continuation !== null && (form.getAll("pageToken").length !== 1 || !continuation || continuation.length > 8192 ||
          form.getAll("stream").length !== 1 || !isInspectionStream(form.get("stream") ?? ""))) {
        return respond("Invalid continuation request.", 400);
      }
      if ((continuation === null || form.get("activity") === "true") && !await store.activity(sessionHash, clock())) {
        return signInRequired();
      }
      let accessToken: string;
      try {
        const refreshToken = await decryptRefreshToken(connection.refresh_ciphertext, config.encryptionKey, connection.google_sub, config.clientId);
        accessToken = await google.refresh(refreshToken, config);
      } catch {
        return healthPage(date, timeZone, undefined, "Google authorization could not be renewed. Retry later or use Renew Google authorization below.", 503);
      }
      try {
        if (!await store.session(sessionHash, clock())) return signInRequired();
        if (continuation !== null) {
          const result = await health.streamPage(accessToken, window, form.get("stream")!, continuation);
          if (!await store.session(sessionHash, clock())) return signInRequired();
          return respond(JSON.stringify(result), 200, { "Content-Type": "application/json; charset=utf-8" });
        }
        await health.checkIdentity(accessToken);
        if (!await store.session(sessionHash, clock())) return signInRequired();
        const result = await health.inspectAll(accessToken, window, () => store.session(sessionHash, clock()));
        if (!await store.session(sessionHash, clock())) return signInRequired();
        return healthPage(date, timeZone, result);
      } catch (error) {
        if (!await store.session(sessionHash, clock())) return signInRequired();
        return healthPage(date, timeZone, undefined, error instanceof HealthCheckError ? error.message
          : "The Google Health check could not be completed. No health records were saved. Retry later.", 503);
      }
    }
    if (url.pathname === "/settings/disconnect" || url.pathname === "/auth/disconnect") {
      if (!sessionHash || !await store.session(sessionHash, now)) return signInRequired();
      if (url.pathname === "/settings/disconnect") return disconnectPage();
      if (request.headers.get("Content-Type")?.split(";")[0] !== "application/x-www-form-urlencoded") return respond("Confirmation required.", 400);
      const form = new URLSearchParams(await request.text());
      if (form.getAll("confirmation").length !== 1 || form.get("confirmation") !== "disconnect") return respond("Confirmation required.", 400);
      const connection = await store.connection();
      if (!connection) return signInRequired();
      try {
        const token = await decryptRefreshToken(connection.refresh_ciphertext, config.encryptionKey, connection.google_sub, config.clientId);
        await google.revoke(token);
      } catch {
        return disconnectPage(true);
      }
      await store.clear();
      const response = respond(null, 303, { Location: "/auth/status", "Set-Cookie": secureCookie(SESSION_COOKIE, "", 0) });
      response.headers.append("Set-Cookie", secureCookie(FLOW_COOKIE, "", 0));
      return response;
    }
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/auth/status" || url.pathname === "/api/session")) {
      const signedIn = sessionHash !== null && await store.session(sessionHash, now);
      if (url.pathname === "/api/session") return respond(JSON.stringify({ authenticated: signedIn, healthDataAccess: "not_checked" }), signedIn ? 200 : 401,
        { "Content-Type": "application/json; charset=utf-8" });
      return page(true, signedIn, url.searchParams.get("result"));
    }

    if (request.method === "POST" && url.pathname === "/auth/google/start") {
      await store.cleanup(now);
      const browserId = readCookie(request, FLOW_COOKIE) ?? randomToken();
      const state = randomToken();
      const verifier = randomToken();
      const nonce = randomToken();
      if (!await store.begin(await hash(state), await hash(browserId), verifier, nonce, now)) {
        return respond("Sign-in is busy. Try again later.", 503);
      }
      const connection = await store.connection();
      const renew = request.headers.get("Content-Type")?.split(";")[0] === "application/x-www-form-urlencoded" &&
        new URLSearchParams(await request.text()).get("renew") === "true";
      const needsConsent = renew || !usableConnection(connection, now);
      return respond(null, 303, {
        Location: authorizationUrl(config, state, await hash(verifier), nonce, needsConsent),
        "Set-Cookie": secureCookie(FLOW_COOKIE, browserId, FLOW_MS / 1000),
      });
    }

    if (request.method === "GET" && isCallback) {
      let claimedState: string | null = null;
      try {
        const browserId = readCookie(request, FLOW_COOKIE);
        const states = url.searchParams.getAll("state");
        if (!browserId || states.length !== 1 || !/^[A-Za-z0-9_-]{43}$/.test(states[0]!)) return redirect("failed");
        await store.cleanup(now);
        const stateHash = await hash(states[0]!);
        const flow = await store.consume(stateHash, await hash(browserId), now);
        if (!flow) return redirect("failed");
        claimedState = stateHash;
        const codes = url.searchParams.getAll("code");
        const errors = url.searchParams.getAll("error");
        if (codes.length === 0 && errors.length === 1 && errors[0] === "access_denied") return redirect("denied");
        if (codes.length !== 1 || !codes[0]?.trim() || errors.length !== 0) return redirect("failed");

        const identity = await google.exchange(codes[0], flow.pkce_verifier, flow.oidc_nonce, config, clock);
        if (identity.email !== config.owner) return redirect("failed");
        const previous = await store.connection();
        if (previous && previous.google_sub !== identity.subject) return redirect("failed");
        if (!identity.refreshToken && !usableConnection(previous, now)) return redirect("failed");
        const refreshCiphertext = identity.refreshToken
          ? await encryptRefreshToken(identity.refreshToken, config.encryptionKey, identity.subject, config.clientId)
          : previous!.refresh_ciphertext;
        const id = randomToken();
        const saved = await store.signIn({
          google_sub: identity.subject, refresh_ciphertext: refreshCiphertext,
          refresh_expires_at: identity.refreshToken ? identity.refreshExpiresAt : previous!.refresh_expires_at,
          granted_scope: identity.scope,
        }, await hash(id), clock(), stateHash);
        claimedState = null;
        if (!saved) return redirect("failed");
        const response = redirect();
        response.headers.append("Set-Cookie", secureCookie(SESSION_COOKIE, id, SESSION_MS / 1000));
        return response;
      } catch {
        return redirect("failed");
      } finally {
        if (claimedState) await store.discardFlow(claimedState);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/session/activity") {
      const active = sessionHash !== null && await store.activity(sessionHash, now);
      return respond(active ? null : "Sign-in required.", active ? 204 : 401);
    }
    if (request.method === "POST" && url.pathname === "/auth/logout") {
      if (sessionHash) await store.logout(sessionHash);
      return respond(null, 303, { Location: "/auth/status", "Set-Cookie": secureCookie(SESSION_COOKIE, "", 0) });
    }
    return respond("Not found.", 404);
  };
}
