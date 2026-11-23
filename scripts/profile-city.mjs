// Run against the local synthetic replay with the project Node version.
import { mkdtemp, rm, stat } from "node:fs/promises";
import { cpus, totalmem, tmpdir } from "node:os";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";
import { build } from "vite";

const host = "http://127.0.0.1:8787";
const output = await mkdtemp(path.join(tmpdir(), "healthcity-profile-"));
let browser;
try {
  await build({
    configFile: false, publicDir: false, logLevel: "error",
    plugins: [{
      name: "city-profile", enforce: "pre",
      transform(source, id) {
        if (id.endsWith("/BoatScene.tsx")) return source + `
          import { _roots } from "@react-three/fiber";
          import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
          import { WebGLRenderTarget } from "three";
          window.cityProfile = () => ({
            ..._roots.get(document.querySelector("canvas")).store.getState(), GTAOPass, WebGLRenderTarget
          });`;
        if (id.endsWith("/city/CityGround.tsx")) return source + `
          import { assembleBlock } from "./building-assembler.ts";
          window.countBuildingModules = night => assembleBlock(marketBuildings, night).length;`;
      },
    }, react()],
    build: { outDir: output, target: "es2022" },
  });
  browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== host) return route.abort();
    const file = path.join(output, url.pathname === "/" ? "index.html" : url.pathname);
    const exists = await stat(file).catch(() => null);
    return exists?.isFile() ? route.fulfill({ path: file }) : route.continue();
  });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto(host);
  await page.getByRole("combobox", {name:"Speed", exact:true}).selectOption("1");
  console.log(JSON.stringify({ chip: cpus()[0].model, memoryGiB: totalmem()/2**30, chrome: browser.version() }));
  const cases = [11,12,13,14,15].flatMap(day => ["Day", "Night"].map(light => ({day, view:"world", light})));
  for (const view of ["harbor", "walk", "skyline"]) cases.push({day:11, view, light:"Day"});
  cases.push({day:11, view:"world", light:"Day", ao:true});
  for (const item of cases) {
    await page.getByLabel("Replay date").selectOption("2026-11-" + item.day);
    await page.getByLabel("Scene view").selectOption(item.view);
    await page.getByRole("slider", {name:"Replay time", exact:true}).fill("43200");
    await page.getByRole("button", {name:item.light, exact:true}).click();
    await page.getByRole("button", {name:"Play", exact:true}).click();
    const metrics = await page.evaluate(sampleFrames, item);
    await page.getByRole("button", {name:"Pause", exact:true}).click();
    console.log(JSON.stringify({...item, ...metrics}));
    if (process.argv.includes("--capture") && item.day === 11 && item.view === "world" && !item.ao) {
      await page.getByRole("slider", {name:"Replay time", exact:true}).fill("43200");
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const clip = await page.locator("canvas").boundingBox();
      await page.screenshot({clip, style:".world > :not(.scene-canvas){visibility:hidden!important}",
        path:"design/visual-studies/city-v2/world-performance-" + item.light.toLowerCase() + ".png"});
    }
  }
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser?.close();
  await rm(output, {recursive:true, force:true});
}

async function sampleFrames({ light, ao }) {
  const { gl, scene, camera, GTAOPass, WebGLRenderTarget } = window.cityProfile();
  const ctx = gl.getContext(), debug = ctx.getExtension("WEBGL_debug_renderer_info");
  const timer = ao && ctx.getExtension("EXT_disjoint_timer_query_webgl2");
  const {width, height} = gl.domElement;
  const modules = window.countBuildingModules(light === "Night");
  const pass = ao ? new GTAOPass(scene, camera, width, height) : null;
  const target = ao ? new WebGLRenderTarget(width, height) : null;
  if (pass) pass.renderToScreen = true;
  const original = gl.render, autoReset = gl.info.autoReset;
  const frame = () => new Promise(requestAnimationFrame);
  const times = [], gpuTimes = [];
  let query, nested = false, maxCalls = 0, maxTriangles = 0, sampling = false;
  gl.info.autoReset = false;
  gl.render = function(currentScene, activeCamera) {
    if (nested) return original.call(this, currentScene, activeCamera);
    nested = true;
    try {
      gl.info.reset();
      if (target) gl.setRenderTarget(target);
      original.call(this, currentScene, activeCamera);
      if (pass) {
        gl.setRenderTarget(null);
        const ocean = scene.getObjectByName("Ocean refraction pre-pass");
        const shadowUpdates = gl.shadowMap.autoUpdate;
        ocean.visible = false;
        gl.shadowMap.autoUpdate = false;
        if (query && ctx.getQueryParameter(query, ctx.QUERY_RESULT_AVAILABLE)) {
          if (sampling && !ctx.getParameter(timer.GPU_DISJOINT_EXT)) gpuTimes.push(ctx.getQueryParameter(query, ctx.QUERY_RESULT)/1e6);
          ctx.deleteQuery(query);
          query = null;
        }
        const startQuery = timer && !query;
        if (startQuery) {
          query = ctx.createQuery();
          ctx.beginQuery(timer.TIME_ELAPSED_EXT, query);
        }
        try { pass.render(gl, null, target); }
        finally {
          if (startQuery) ctx.endQuery(timer.TIME_ELAPSED_EXT);
          gl.shadowMap.autoUpdate = shadowUpdates;
          ocean.visible = true;
          gl.setRenderTarget(null);
        }
      }
      if (sampling) {
        maxCalls = Math.max(maxCalls, gl.info.render.calls);
        maxTriangles = Math.max(maxTriangles, gl.info.render.triangles);
      }
    } finally { nested = false; }
  };
  try {
    for (let i=0; i<55; i++) await frame();
    let previous = await frame();
    sampling = true;
    for (let i=0; i<110; i++) {
      const next = await frame();
      times.push(next-previous);
      previous = next;
    }
    const median = a => a.sort((x,y) => x-y)[Math.floor(a.length/2)];
    return {gpu: debug && ctx.getParameter(debug.UNMASKED_RENDERER_WEBGL), width, height,
      maxCalls, maxTriangles, modules, medianFrameMs: +median(times).toFixed(2),
      ...(ao && {aoGpuMs: gpuTimes.length ? +median(gpuTimes).toFixed(3) : null, gpuSamples: gpuTimes.length})};
  } finally {
    gl.render = original;
    gl.info.autoReset = autoReset;
    if (query) ctx.deleteQuery(query);
    pass?.dispose();
    target?.dispose();
  }
}
