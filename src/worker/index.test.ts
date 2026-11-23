import { describe, expect, it, vi } from "vitest";
import worker from "./index.ts";
import { DAILY_HRV_PATH } from "../core/daily-hrv.ts";

const origin = "https://healthcity.yahsiu.workers.dev";

describe("HealthCity Worker routes", () => {
  it("serves explicit example days and keeps the live request disabled by default", async () => {
    const demo = await worker.fetch(new Request(origin + DAILY_HRV_PATH + "?date=2026-11-11"));
    expect(demo.status).toBe(200);
    expect(demo.headers.get("Cache-Control")).toBe("no-store");
    expect(await demo.json()).toEqual({
      hrv: { source: "synthetic", date: "2026-11-11", rmssdMs: 103.7 }, googleHealthEnabled: false,
    });
    const missing = await worker.fetch(new Request(origin + DAILY_HRV_PATH + "?date=2026-11-12"));
    expect(await missing.json()).toMatchObject({ hrv: { rmssdMs: null } });
    expect((await worker.fetch(new Request(origin + DAILY_HRV_PATH + "?date=2026-11-11&date=2026-11-12"))).status).toBe(404);
    const disabled = await worker.fetch(new Request(origin + DAILY_HRV_PATH, { method: "POST" }));
    expect(disabled.status).toBe(503);
    expect(await disabled.json()).toEqual({ error: "replay_disabled" });
  });
  it("serves the frontend without sending backend routes through asset handling", async () => {
    const fetch = vi.fn(async () => new Response("<main>HealthCity</main>", { headers: { "Content-Type": "text/html" } }));
    const env = { ASSETS: { fetch } };
    const home = await worker.fetch(new Request(`${origin}/`), env);
    expect(await home.text()).toContain("HealthCity");
    expect(home.headers.get("Cache-Control")).toBe("no-store");
    expect(fetch).toHaveBeenCalledTimes(1);
    for (const path of ["/auth/google/callback?code=synthetic", "/api/session", "/checks/health", "/settings/disconnect", "/api/unknown", "/auth/unknown"]) {
      const response = await worker.fetch(new Request(`${origin}${path}`), env);
      expect(response.headers.get("Content-Type")).not.toBe("text/html");
    }
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await worker.fetch(new Request(`${origin}/`, { method: "POST" }), env)).status).toBe(405);
    const head = await worker.fetch(new Request(`${origin}/`, { method: "HEAD" }), env);
    expect(await head.text()).toBe("");
  });
  it("redirects callback requests without reflecting or processing their parameters", async () => {
    const response = await worker.fetch(new Request(`${origin}/auth/google/callback?code=synthetic-code&state=synthetic-state&error_description=private-detail`));
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/auth/status?result=failed");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(await response.text()).toBe("");
    const status = await worker.fetch(new Request(`${origin}/auth/status`));
    expect(status.status).toBe(503);
    expect(status.headers.has("Set-Cookie")).toBe(false);
  });

  it("rejects unsupported routes and methods and returns no body for HEAD", async () => {
    expect((await worker.fetch(new Request(`${origin}/missing`))).status).toBe(404);
    const post = await worker.fetch(new Request(`${origin}/auth/google/callback`, { method: "POST" }));
    expect(post.status).toBe(405);
    expect(post.headers.get("Allow")).toBe("GET");
    const healthRead = await worker.fetch(new Request(`${origin}/checks/health/run`));
    expect(healthRead.status).toBe(405);
    expect(healthRead.headers.get("Allow")).toBe("POST");
    const script = await worker.fetch(new Request(`${origin}/checks/form.js`), {
      ASSETS: { fetch: async () => new Response("/* bundled inspection script */", {
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      }) },
    });
    expect(script.headers.get("Content-Type")).toContain("application/javascript");
    expect(await script.text()).not.toContain("Bearer");
    const head = await worker.fetch(new Request(`${origin}/health`, { method: "HEAD" }));
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });
});
