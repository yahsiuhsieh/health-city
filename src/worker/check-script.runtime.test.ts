import { expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

it("executes the production browser merge functions after Worker bundling", async () => {
  execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "deploy", "--dry-run", "--outdir", "dist/worker"], {
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: ".wrangler/logs" },
    stdio: "pipe",
  });
  const runtime = new Miniflare({ ...convertV4MiniflareOptions({
    host: "127.0.0.1", port: 0, cf: false, modules: true, compatibilityDate: "2026-11-09", script: readFileSync("dist/worker/index.js", "utf8"),
    outboundService: async () => { throw new Error("Unexpected external request."); },
  }), telemetry: { enabled: false }, enableDevRegistry: false });
  try {
    const script = await (await runtime.dispatchFetch("https://healthcity.test/checks/form.js")).text();
    const field = { value: "UTC", addEventListener() {} };
    const context = {
      document: { getElementById: (id: string) => id === "continuation-seed" || id === "continue-batch" ? null : field },
      window: { addEventListener() {} },
    };
    const count = runInNewContext(script + `
      mergeInspectionPages('heart-rate',
        {count:1,tables:[{rows:[['a','b',60,1,'2026-11-04T00:01:00Z','2026-11-04T00:01:00Z']]}]},
        {count:1,tables:[{rows:[['a','b',80,1,'2026-11-04T00:02:00Z','2026-11-04T00:02:00Z']]}]}).tables[0].rows[0][2]
    `, context);
    expect(count).toBe(70);
    for (const key of ["daily-resting-heart-rate", "daily-heart-rate-variability", "total-calories", "steps", "sleep", "exercise", "time-in-heart-rate-zone"]) {
      const merged = runInNewContext(`
        mergeInspectionPages(${JSON.stringify(key)},
          {count:1,tables:[{title:'Summary',columns:['Session','Value'],rows:[['Sleep 1',60]]}]},
          {count:1,tables:[{title:'Summary',columns:['Session','Value'],rows:[['Sleep 1',80]]}]})
      `, context);
      expect(merged.count).toBe(2);
      expect(merged.tables[0].rows).toEqual([["Sleep 1", 60], ["Sleep 2", 80]]);
    }
  } finally { await runtime.dispose(); }
}, 30_000);
