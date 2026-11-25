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
        // Enable the night fixture only in this temporary production client.
        if (id.endsWith("/frontend/App.tsx")) return source.replace(
          'import.meta.env.DEV&&new URLSearchParams(location.search).get("lighting")==="night"',
          'new URLSearchParams(location.search).get("lighting")==="night"'
        );
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
  console.log(JSON.stringify({chip:cpus()[0].model,memoryGiB:totalmem()/2**30,chrome:browser.version()}));
  for (const light of process.argv.includes("--glass-only")?[]:["Day","Night"]) {
    await page.goto(host+(light==="Night"?"/?lighting=night":"/"));
    await page.locator(light==="Night"?".glass-night":".glass-shell:not(.glass-night)").waitFor();
    for (const day of [11,12,13,14,15]) {
      await page.getByRole("button",{name:/Choose replay date/}).click();
      await page.getByLabel("Replay date",{exact:true}).selectOption("2026-11-"+day);
      await page.locator("[data-chip=world]").click();
      const clock=page.getByRole("slider",{name:"Replay time",exact:true});
      await clock.fill("43200");
      const play=page.getByRole("button",{name:"Play",exact:true});
      await play.click();
      const item={day,view:"world",light};
      const metrics=await page.evaluate(sampleFrames,item);
      await page.getByRole("button",{name:"Pause",exact:true}).click();
      console.log(JSON.stringify({...item,...metrics}));
      if(process.argv.includes("--capture")&&day===11){
        await clock.fill("43200");
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.locator("canvas").screenshot({style:".glass-shell > :not(.scene-canvas){visibility:hidden!important}",path:"design/visual-studies/city-v2/world-performance-"+light.toLowerCase()+".png"});
      }
    }
    if(light==="Day"){
      await page.getByRole("button",{name:/Choose replay date/}).click();
      await page.getByLabel("Replay date",{exact:true}).selectOption("2026-11-11");
      await page.getByRole("slider",{name:"Replay time",exact:true}).fill("43200");
      for(const view of ["steps","hrv","rhr","world"]){
        await page.locator('[data-chip="'+view+'"]').click();
        await page.waitForTimeout(1900);
        const item={light,view,day:11,ao:view==="world"&&process.argv.includes("--ao")};
        console.log(JSON.stringify({...item,...await page.evaluate(sampleFrames,item)}));
      }
    }
  }
  if(process.argv.includes("--glass-only")){
    await page.goto(host);
    await page.getByRole("button",{name:/Choose replay date/}).click();
    await page.getByLabel("Replay date",{exact:true}).selectOption("2026-11-11");
    await page.getByRole("slider",{name:"Replay time"}).fill("43200");
    await page.locator('[aria-label="Play"]:enabled').waitFor();
    await page.waitForFunction(()=>!!window.cityProfile().scene.getObjectByName("Ridge saddle reservoir"));
    await measureGlass(page);
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

async function measureGlass(page) {
  const session = await page.context().newCDPSession(page);
  for (const view of ["world", "rhr"]) {
    await page.locator('[data-chip="'+view+'"]').click();
    await page.waitForTimeout(1900);
    for (const mode of ["hidden","opaque","glass","glass","opaque","hidden"]) {
      const enabled=mode==="glass";
      const override = enabled ? null : await page.addStyleTag({
        content: mode==="hidden" ? ".glass-shell > :not(.scene-canvas){visibility:hidden!important}" : ".glass-shell .glass{backdrop-filter:none!important}",
      });
      const surfaces = await page.evaluate(async () => {
        for (let i=0; i<55; i++) await new Promise(requestAnimationFrame);
        return [...document.querySelectorAll(".glass-shell .glass")]
          .filter(el => el.checkVisibility({visibilityProperty:true}) && getComputedStyle(el).backdropFilter !== "none").length;
      });
      if (surfaces !== (enabled ? view==="world" ? 4 : 5 : 0)) throw Error("Unexpected glass surface count.");
      const events = [];
      const collect = ({value}) => events.push(...value);
      session.on("Tracing.dataCollected", collect);
      await session.send("Tracing.start", {
        categories:"benchmark,viz,gpu,disabled-by-default-gpu.device,disabled-by-default-viz.gpu_composite_time",
        options:"record-as-much-as-possible",
      });
      const intervals = await page.evaluate(async () => {
        const times=[];
        let previous=await new Promise(requestAnimationFrame);
        for (let i=0; i<110; i++) {
          const next=await new Promise(requestAnimationFrame);
          times.push(next-previous);
          previous=next;
        }
        return times;
      });
      const complete = new Promise(resolve=>session.once("Tracing.tracingComplete",resolve));
      await session.send("Tracing.end");
      await complete;
      session.off("Tracing.dataCollected",collect);
      const median = values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
      const duration = name=>{
        const samples=events.filter(e=>e.name===name && e.dur).map(e=>e.dur/1000);
        if (samples.length<55) throw Error("Insufficient compositor samples for "+name);
        return median(samples);
      };
      console.log(JSON.stringify({view,mode,surfaces,frameMs:median(intervals),
        drawSwapMs:duration("Display::DrawAndSwap"),gpuThreadSwapMs:duration("SkiaOutputSurfaceImplOnGpu::SwapBuffers"),
        deviceIntervals:events.filter(e=>e.cat?.includes("gpu.device") && e.dur).length}));
      if (override) await override.evaluate(el=>el.remove());
    }
  }
  await session.detach();
  for (const view of ["hrv","rhr","steps","world"]) {
    const intervals=await page.evaluate(async target=>{
      document.querySelector('[data-chip="'+target+'"]').click();
      const times=[];
      const start=performance.now();
      let previous=start;
      while(previous-start<2000){
        const next=await new Promise(requestAnimationFrame);
        if(next>previous)times.push(next-previous);
        previous=next;
      }
      return times.sort((a,b)=>a-b);
    },view);
    console.log(JSON.stringify({flight:view,frames:intervals.length,medianMs:intervals[Math.floor(intervals.length*.5)],
      p95Ms:intervals[Math.floor(intervals.length*.95)],maxMs:intervals.at(-1)}));
  }
}
