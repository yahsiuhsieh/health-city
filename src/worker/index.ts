import { createAuthHandler } from "./auth.ts";
import { respond, respondJson } from "./http.ts";
import { DAILY_HRV_PATH, EXAMPLE_HRV } from "../core/daily-hrv.ts";
import type { DailyHrvResponse } from "../core/daily-hrv.ts";
import type { Env } from "./auth.ts";
import { CHECK_CSS } from "./health-check.ts";

const handleAuth = createAuthHandler();

export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    const url = new URL(request.url);
    if ((url.pathname === "/" || url.pathname === "/index.html") && env.ASSETS) {
      if (request.method !== "GET" && request.method !== "HEAD") return respond("Method not allowed.", 405, { Allow: "GET, HEAD" });
      const asset = await env.ASSETS.fetch(request);
      const response = new Response(request.method === "HEAD" ? null : asset.body, asset);
      response.headers.set("Cache-Control", "no-store");
      return response;
    }
    if (url.pathname === "/checks/form.js" || url.pathname === "/checks/styles.css") {
      if (request.method !== "GET") return respond("Method not allowed.", 405, { Allow: "GET" });
      const script = url.pathname.endsWith(".js");
      if (script) {
        if (!env.ASSETS) return respond("Inspection script is unavailable.", 503);
        const assetUrl = new URL(request.url);
        if (import.meta.env?.DEV) assetUrl.pathname = "/src/frontend/inspection.ts";
        const asset = await env.ASSETS.fetch(new Request(assetUrl, request));
        const response = new Response(asset.body, asset);
        response.headers.set("Cache-Control", "no-store");
        return response;
      }
      return respond(CHECK_CSS, 200, { "Content-Type": "text/css; charset=utf-8" });
    }
    if (url.pathname === "/health") {
      if (request.method === "GET") return respond("HealthCity backend is running.");
      if (request.method === "HEAD") return respond(null);
      return respond("Method not allowed.", 405, { Allow: "GET, HEAD" });
    }
    if (url.pathname === DAILY_HRV_PATH && request.method !== "POST") {
      if (request.method !== "GET") return respond("Method not allowed.", 405, { Allow: "GET, POST" });
      const dates = url.searchParams.getAll("date");
      const date = dates[0];
      const rmssdMs = dates.length === 1 && date ? EXAMPLE_HRV.get(date) : undefined;
      if (!date || rmssdMs === undefined) return respondJson({ error: "example_not_found" }, 404);
      const result: DailyHrvResponse = {
        hrv: { source: "synthetic", date, rmssdMs },
        googleHealthEnabled: env.GOOGLE_HRV_REPLAY_ENABLED === "true",
      };
      return respondJson(result);
    }
    try {
      return await handleAuth(request, env);
    } catch {
      return respond("Service temporarily unavailable. Try again later.", 503);
    }
  },
};
