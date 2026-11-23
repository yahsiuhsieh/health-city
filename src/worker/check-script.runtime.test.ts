import { expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

it("runs the built inspection entry with explicit continuation and no automatic requests", async () => {
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
    env: { ...process.env, NODE_ENV: "production", WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: ".wrangler/logs" },
    stdio: "pipe",
  });
  const scriptFile = readFileSync("dist/client/checks/form.js", "utf8");
  const assetPaths: string[] = [];
  const runtime = new Miniflare({ ...convertV4MiniflareOptions({
    host: "127.0.0.1", port: 0, cf: false, modules: true, compatibilityDate: "2026-11-09",
    script: readFileSync("dist/healthcity/index.js", "utf8"),
    serviceBindings: { ASSETS: async (request: Request) => {
      assetPaths.push(new URL(request.url).pathname);
      return new Response(scriptFile, { headers: { "Content-Type": "application/javascript" } });
    } },
    outboundService: async () => { throw new Error("Unexpected external request."); },
  }), telemetry: { enabled: false }, enableDevRegistry: false });
  let script: string;
  try {
    const response = await runtime.dispatchFetch("https://healthcity.test/checks/form.js");
    expect(response.status).toBe(200);
    script = await response.text();
    expect(script).toBe(scriptFile);
    expect(assetPaths).toEqual(["/checks/form.js"]);
    expect((await runtime.dispatchFetch("https://healthcity.test/auth/google/callback?code=synthetic", { redirect: "manual" })).status).toBe(303);
    expect((await runtime.dispatchFetch("https://healthcity.test/api/unknown")).status).toBe(404);
    const demo = await runtime.dispatchFetch("https://healthcity.test/api/replay/daily-hrv?date=2026-11-11");
    expect(await demo.json()).toEqual({
      hrv: { source: "synthetic", date: "2026-11-11", rmssdMs: 103.7 }, googleHealthEnabled: false,
    });
    expect(assetPaths).toEqual(["/checks/form.js"]);
  } finally { await runtime.dispose(); }
  const handlers = new Map<string, () => Promise<void>>();
  const requests: URLSearchParams[] = [];
  const field = { value: "UTC", textContent: "", disabled: false,
    addEventListener() {}, getAttribute() { return null; }, setAttribute() {}, removeAttribute() {} };
  const states = [{
    key: "heart-rate", title: "Heart rate", date: "2026-11-04", zone: "UTC", token: "synthetic-next",
    data: { count: 1, notes: [], tables: [{ title: "Mean", columns: ["Start", "End", "Mean"],
      rows: [["a", "b", 60]] }] },
  }];
  const tableNodes: { textContent?: string; children: unknown[] }[] = [];
  const node = () => {
    const item = { textContent: "", children: [] as unknown[], append(...children: unknown[]) { this.children.push(...children); } };
    tableNodes.push(item);
    return item;
  };
  const cells = [field, { textContent: "" }, { textContent: "" }];
  const streamStatus = { textContent: "" };
  const batchProgress = { textContent: "" };
  const container = { replaceChildren() {}, append() {} };
  const elements: Record<string, unknown> = {
    "continuation-seed": { textContent: JSON.stringify(states) },
    "continue-batch": { disabled: false, addEventListener: (name: string, handler: () => Promise<void>) => handlers.set(name, handler) },
    "heart-rate": { querySelector: (selector: string) => selector === ".tables" ? container : selector === "strong" ? streamStatus : null },
    "batch-progress": batchProgress,
  };
  runInNewContext(script, {
    document: {
      getElementById: (id: string) => elements[id] ?? field,
      createElement: node,
      querySelector: () => ({ closest: () => ({ cells }) }),
    },
    window: { addEventListener() {} },
    URLSearchParams,
    fetch: async (_url: string, options: RequestInit) => {
      requests.push(options.body as URLSearchParams);
      return { ok: true, headers: new Headers({ "Content-Type": "application/json" }), json: async () => ({
        nextPageToken: "", data: { ...states[0]!.data, tables: [{ ...states[0]!.data.tables[0],
          rows: [["c", "d", 80]] }] },
      }) };
    },
  });
  expect(requests).toHaveLength(0);
  await handlers.get("click")!();
  expect(requests).toHaveLength(1);
  expect(requests[0]!.get("pageToken")).toBe("synthetic-next");
  expect(requests[0]!.get("activity")).toBe("true");
  expect(tableNodes.some(item => item.textContent === "80")).toBe(true);
  expect(cells[2]!.textContent).toBe("2");
  expect(streamStatus.textContent).toBe("complete");
  expect(batchProgress.textContent).toBe("All page sequences complete.");
  expect((elements["continue-batch"] as { disabled: boolean }).disabled).toBe(true);
}, 30_000);
