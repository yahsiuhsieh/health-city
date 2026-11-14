import { expect, it } from "vitest";
import { build } from "esbuild";
import { runInNewContext } from "node:vm";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

it("executes the production browser merge functions after Worker bundling", async () => {
  const output = await build({ entryPoints: ["src/worker/index.ts"], bundle: true, write: false, format: "esm", platform: "browser" });
  const runtime = new Miniflare({ ...convertV4MiniflareOptions({
    host: "127.0.0.1", port: 0, cf: false, modules: true, compatibilityDate: "2026-11-09", script: output.outputFiles[0]!.text,
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
  } finally { await runtime.dispose(); }
});
