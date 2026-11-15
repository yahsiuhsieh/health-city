import { createAuthHandler } from "./auth.ts";
import { respond } from "./http.ts";
import type { Env } from "./auth.ts";
import { CHECK_CSS, HEALTH_CHECK_SCRIPT } from "./health-check.ts";

const handleAuth = createAuthHandler();

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
    try {
      return await handleAuth(request, env);
    } catch {
      return respond("Service temporarily unavailable. Try again later.", 503);
    }
  },
};
