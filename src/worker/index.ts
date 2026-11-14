import { createAuthHandler, respond } from "./auth.ts";
import type { Env } from "./auth.ts";
import { CHECK_CSS, HEALTH_CHECK_SCRIPT } from "./health-check.ts";

const handleAuth = createAuthHandler();
const routes = new Map([
  ["/", "GET"], ["/auth/status", "GET"], ["/api/session", "GET"],
  ["/auth/google/start", "POST"], ["/auth/google/callback", "GET"],
  ["/auth/logout", "POST"], ["/api/session/activity", "POST"],
  ["/settings/disconnect", "GET"], ["/auth/disconnect", "POST"],
  ["/checks/health", "GET"], ["/checks/health/run", "POST"],
]);

export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/checks/form.js" || url.pathname === "/checks/styles.css") {
      if (request.method !== "GET") return respond("Method not allowed.", 405, { Allow: "GET" });
      const script = url.pathname.endsWith(".js");
      return respond(script ? HEALTH_CHECK_SCRIPT : CHECK_CSS, 200,
        { "Content-Type": script ? "application/javascript; charset=utf-8" : "text/css; charset=utf-8" });
    }
    if (url.pathname === "/health") {
      if (request.method === "GET") return respond("HealthCity backend is running.");
      if (request.method === "HEAD") return respond(null);
      return respond("Method not allowed.", 405, { Allow: "GET, HEAD" });
    }
    const method = routes.get(url.pathname);
    if (!method) return respond("Not found.", 404);
    if (request.method !== method) return respond("Method not allowed.", 405, { Allow: method });
    try {
      return await handleAuth(request, env);
    } catch {
      return respond("Service temporarily unavailable. Try again later.", 503);
    }
  },
};
