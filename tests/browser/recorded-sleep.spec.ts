import { expect, test } from "@playwright/test";
import { napSleep, overnightSleep, sleepDate, sleepStartDate, sleepWithMissingStages, sleepZone } from "../fixtures/sleep-replay.ts";
import { JETTY_HEAD, JETTY_SLIDE } from "../../src/scene/sleep/route.ts";
import { dayWindow } from "../../src/worker/health-data.ts";
import { replaySleep } from "../../src/worker/replay-sleep.ts";

test("recorded sleep drives the boat, chart, and island on the selected day", async ({page}) => {
  test.setTimeout(90_000);
  let sleepMode: "ready" | "empty" | "failed" = "ready";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://127.0.0.1:8787") return route.abort();
    if (url.pathname === "/api/replay/daily-hrv") {
      return route.fulfill({json:{googleHealthEnabled:true, hrv:{source:"synthetic",date:url.searchParams.get("date"),rmssdMs:27.4}}});
    }
    if (url.pathname === "/api/replay/day") {
      const date = new URLSearchParams(route.request().postData()!).get("date")!;
      const values = {status:"ready",value:Array(288).fill(null)};
      const sleep = sleepMode === "failed" ? {status:"failed"} : {
        status:"ready",
        value:sleepMode === "empty" ? [] : replaySleep([overnightSleep,napSleep,sleepWithMissingStages],dayWindow(date,sleepZone)!),
      };
      return route.fulfill({json:{date,timeZone:sleepZone,hrv:{status:"ready",value:20},steps:values,calories:values,heartRate:values,sleep}});
    }
    return route.continue();
  });
  await page.goto("/");
  await page.getByLabel("Replay source").selectOption("google-health");
  await page.getByRole("combobox",{name:"Scene view"}).selectOption("sleep");
  const date = page.getByLabel("Replay date"), slider = page.getByRole("slider",{name:"Replay time",exact:true});
  const load = page.getByRole("button",{name:"Load day"}), chart = page.locator(".voyage-chart");
  const showChart = async () => {
    await page.getByRole("button",{name:"Inspect sleep voyage"}).click();
    await page.getByRole("button",{name:"Open sleep voyage"}).click();
  };

  const readScene = () => page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    const fiber = performance.getEntriesByType("resource").find(entry => entry.name.includes("/@react-three_fiber.js"));
    if (!fiber) return null;
    const {_roots} = await import(fiber.name) as typeof import("@react-three/fiber");
    const scene = _roots.get(document.querySelector("canvas")!)?.store.getState().scene;
    const vessel = scene?.getObjectByName("cargo-hull");
    const land = scene?.getObjectByName("Coral cay");
    return vessel ? {x:vessel.matrixWorld.elements[12]!,z:vessel.matrixWorld.elements[14]!,island:land?.parent?.visible ?? false} : null;
  });

  await date.fill(sleepStartDate);
  await load.click();
  await page.getByRole("button",{name:"Completed day"}).click();
  await expect(page.getByText("Light sleep · Google Health")).toBeVisible();
  await showChart();
  await expect(chart.getByText("1 h 0 min", {exact:false}).first()).toBeVisible();
  await expect.poll(readScene).not.toBeNull();
  const beforeMidnight = await readScene();

  await date.fill(sleepDate);
  await load.click();
  await expect(page.getByText("Light sleep · Google Health")).toBeVisible();
  await showChart();
  await expect(chart.getByRole("heading",{name:"Sat, Nov 7"})).toBeVisible();
  await expect.poll(async () => {
    const afterMidnight = await readScene();
    return beforeMidnight && afterMidnight ? Math.hypot(afterMidnight.x-beforeMidnight.x,afterMidnight.z-beforeMidnight.z) : Infinity;
  }).toBeLessThan(.05);
  await slider.fill("3660");
  await expect(chart.getByText(/Awake since 00:58/)).toBeVisible();
  await expect(chart.getByRole("button",{name:/Awake · 00:58–01:01 · 3 min/})).toBeVisible();
  const awakePose = await readScene();
  await slider.fill("3900");
  await expect.poll(async () => {
    const pose = await readScene();
    return pose && awakePose ? Math.hypot(pose.x-awakePose.x,pose.z-awakePose.z) : Infinity;
  }).toBeLessThan(.05);
  await slider.fill("25200");
  await expect(chart.getByText("11,304 m²")).toBeVisible();
  await expect(chart.getByText(/1 awakening, 9 min/)).toBeVisible();
  await expect(chart.getByText("Recorded short awakenings")).toBeVisible();

  const sessions = page.getByRole("combobox",{name:"Sleep session"});
  await slider.fill("50400");
  await expect(chart.getByText(/Unclassified since 14:00/)).toBeVisible();
  await slider.fill("52200");
  await expect(chart.getByText("720 m²")).toBeVisible();
  await expect.poll(async () => {
    const state = await readScene();
    return state?.island && Math.hypot(state.x-JETTY_HEAD[0],state.z-(JETTY_HEAD[1]-JETTY_SLIDE)) < .1;
  }).toBe(true);
  const options = await sessions.locator("option").evaluateAll(items=>items.map(item=>(item as HTMLOptionElement).value));
  await sessions.selectOption(options[1]!);
  await expect(chart.getByRole("heading",{name:"Sat, Nov 7"})).toBeVisible();
  await sessions.selectOption(options[3]!);
  await expect(chart.getByText(/Unavailable since 17:00/)).toBeVisible();
  await page.getByRole("button",{name:"Completed day"}).click();
  await expect(chart.getByText("sleep unavailable", {exact:true})).toBeVisible();
  await expect(chart.getByText("Island", {exact:true})).toHaveCount(0);
  await expect.poll(async () => (await readScene())?.island).toBe(false);

  sleepMode = "empty";
  await load.click();
  await expect(page.getByText("No sleep record", {exact:true})).toBeVisible();
  await expect(sessions).toHaveCount(0);
  await expect(chart).toHaveCount(0);
  sleepMode = "failed";
  await load.click();
  await expect(page.getByText("Sleep read failed", {exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});
