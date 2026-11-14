import { describe, expect, it } from "vitest";
import worker from "./index.ts";

const origin = "https://healthcity.yahsiu.workers.dev";

describe("HealthCity Worker routes", () => {
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
    const script = await worker.fetch(new Request(`${origin}/checks/form.js`));
    expect(script.headers.get("Content-Type")).toContain("application/javascript");
    expect(await script.text()).not.toContain("Bearer");
    const head = await worker.fetch(new Request(`${origin}/health`, { method: "HEAD" }));
    expect(head.status).toBe(200);
    expect(await head.text()).toBe("");
  });
});
