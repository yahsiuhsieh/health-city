import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Block external requests even if application code changes later.
  await page.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.origin === "http://127.0.0.1:8787" ? route.continue() : route.abort();
  });
  const names = ["working-boat", "cargo-berth", "harbor-pedestrian",
    "pedestrian-commuter", "pedestrian-hiker", "pedestrian-crew", "pedestrian-promenade", "pedestrian-child", "pedestrian-shopper",
    "vehicle-van", "vehicle-saloon", "vehicle-hatchback", "vehicle-pickup",
    "tower-glass", "tower-deco", "tower-concrete", "tower-ribbon", "tower-brick"];
  const models = Promise.all(names.map(name =>
    page.waitForResponse(response => response.url().endsWith("/models/" + name + ".glb") && response.ok())));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await models;
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await expect(page.getByText("Synthetic daily HRV 27.40 ms · 5 buildings")).toBeVisible();
  await expect(page.getByText("Graphics stopped.", { exact: false })).toHaveCount(0);
});

test("inspection pauses replay and view controls preserve time", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await expect(page.getByLabel("Replay time", { exact: true }).first()).toHaveText("00:00");
  const view = page.getByRole("combobox", { name: "Scene view" });
  await view.selectOption("harbor");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.locator("output")).not.toHaveText("00:00");
  await page.getByRole("button", { name: "Inspect boat", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The harbor boat" })).toBeVisible();
  const before = await page.locator("output").textContent();
  await view.selectOption("detail");
  await page.getByRole("button", { name: "Night", exact: true }).click();
  await page.getByRole("button", { name: "World view", exact: true }).click();
  await expect(page.locator("output")).toHaveText(before!);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("supports timeline seeking and a narrow layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("slider", { name: "Replay time", exact: true }).fill("43200");
  await expect(page.locator("output")).toHaveText("12:00");
  await page.getByRole("button", { name: "Completed day", exact: true }).click();
  await expect(page.locator("output")).toHaveText("24:00");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Start of day", exact: true }).click();
  await expect(page.locator("output")).toHaveText("00:00");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("combobox", { name: "Scene view" }).selectOption("berth");
  await page.getByRole("button", { name: "Inspect berth", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The cargo berth" })).toBeVisible();
  await page.getByRole("button", { name: "Close berth details", exact: true }).click();
});

test("selecting the cargo berth pauses replay and preserves time during camera and lighting changes", async ({ page }) => {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("combobox", { name: "Scene view" }).selectOption("berth");
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  const canvas = page.locator("canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await canvas.click({ position: { x: bounds!.width / 2, y: bounds!.height / 2 } });
  await expect(page.getByRole("heading", { name: "The cargo berth" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  const time = await page.locator("output").textContent();
  await page.getByRole("button", { name: "Night", exact: true }).click();
  await page.getByRole("button", { name: "World view", exact: true }).click();
  await expect(page.locator("output")).toHaveText(time!);
  await page.getByRole("button", { name: "Close berth details", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("water freezes while paused and seeking restores the same surface", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.reload();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await page.getByRole("combobox", { name: "Scene view" }).selectOption("harbor");
  const canvas = page.locator("canvas");
  const original = await canvas.screenshot();
  await page.waitForTimeout(250);
  expect(original.equals(await canvas.screenshot())).toBe(true);
  await page.getByRole("slider", { name: "Replay time", exact: true }).fill("600");
  expect(original.equals(await canvas.screenshot())).toBe(false);
  await page.getByRole("slider", { name: "Replay time", exact: true }).fill("0");
  expect(original.equals(await canvas.screenshot())).toBe(true);
  await page.getByRole("button", { name: "Night", exact: true }).click();
  expect(original.equals(await canvas.screenshot())).toBe(false);
  expect(errors).toEqual([]);
});

test("compares all five tower designs while preserving daily HRV and replay time", async ({ page }) => {
  const view = page.getByRole("combobox", { name: "Scene view" });
  await expect(view).toHaveValue("skyline");
  await page.getByRole("slider", { name: "Replay time", exact: true }).fill("43200");
  for (const [id, name] of [
    ["glass", "Glass spire"], ["deco", "Deco crown"], ["concrete", "Concrete terraces"],
    ["ribbon", "Ribbon tower"], ["brick", "Brick crown"],
  ] as const) {
    await view.selectOption(id);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await page.getByRole("button", { name: "Inspect tower", exact: true }).click();
    const card = page.getByRole("complementary", { name });
    await expect(card.getByText("27.40 ms", { exact: true })).toBeVisible();
    await expect(card.getByText("5", { exact: true })).toBeVisible();
  }
  await expect(page.locator("output")).toHaveText("12:00");
});

test("water stays visible in World view and tower detail", async ({ page }) => {
  const bounds = (await page.locator("canvas").boundingBox())!;
  // This foreground area contains no buildings, boat, or viewport controls.
  const clip = {
    x: Math.floor(bounds.x + bounds.width * .76),
    y: Math.floor(bounds.y + bounds.height * .91),
    width: 45,
    height: 16,
  };
  const time = page.getByRole("slider", { name: "Replay time", exact: true });
  const view = page.getByRole("combobox", { name: "Scene view" });
  for (const scene of ["world", "glass"]) {
    await view.selectOption(scene);
    await time.fill("0");
    const start = await page.screenshot({ clip });
    await time.fill("600");
    const later = await page.screenshot({ clip });
    expect(later.equals(start), scene).toBe(false);
  }
});

test("date changes reset replay, update the skyline and preserve a manually orbiting camera", async ({ page }) => {
  const canvas = page.locator("canvas");
  const rect = (await canvas.boundingBox())!;
  const date = page.getByRole("combobox", { name: "Replay date" });
  const original = await canvas.screenshot();
  await page.mouse.move(rect.x + rect.width * .5, rect.y + rect.height * .5);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .55, rect.y + rect.height * .53, { steps: 4 });
  await page.mouse.up();
  const customView = await canvas.screenshot();
  expect(customView.equals(original)).toBe(false);
  await page.getByRole("slider", { name: "Replay time" }).fill("43200");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();

  await date.selectOption("2026-11-14");
  await expect(page.getByText("Synthetic daily HRV 12.80 ms · 2 buildings")).toBeVisible();
  await expect(page.locator("output")).toHaveText("00:00");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await date.selectOption("2026-11-13");
  await expect(page.getByText("Synthetic daily HRV 4.60 ms · 0 buildings")).toBeVisible();
  await date.selectOption("2026-11-12");
  await expect(page.getByText("No HRV data", { exact: true })).toBeVisible();
  await date.selectOption("2026-11-15");
  await expect(page.getByText("Synthetic daily HRV 27.40 ms · 5 buildings")).toBeVisible();
  expect((await canvas.screenshot()).equals(customView)).toBe(true);
});

test("loads the expanded skyline from the Worker for the selected example date", async ({ page }) => {
  const date = page.getByRole("combobox", { name: "Replay date" });
  const reply = page.waitForResponse(response => response.url().endsWith("/api/replay/daily-hrv?date=2026-11-11"));
  await date.selectOption("2026-11-11");
  expect(await (await reply).json()).toMatchObject({ hrv: { source: "synthetic", date: "2026-11-11", rmssdMs: 103.7 } });
  await expect(page.getByText("Synthetic daily HRV 103.70 ms · 20 buildings")).toBeVisible();
  await page.getByRole("button", { name: "World view", exact: true }).click();
  await page.getByRole("slider", { name: "Replay time" }).fill("43200");
  await page.getByRole("button", { name: "Inspect skyline", exact: true }).click();
  const card = page.getByRole("complementary", { name: "HRV skyline" });
  await expect(card.getByText("103.70 ms", { exact: true })).toBeVisible();
  await expect(card.getByText("20", { exact: true })).toBeVisible();
});

test("loads one recorded day on demand and distinguishes missing, zero, and failed streams", async ({ page }) => {
  let reads = 0;
  await page.route(/\/api\/replay\/daily-hrv\?/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...await response.json(), googleHealthEnabled: true } });
  });
  await page.route("**/api/replay/day", async route => {
    reads++;
    const body = new URLSearchParams(route.request().postData() ?? "");
    expect(body.get("date")).toBe("2026-11-11");
    expect(body.get("timeZone")).toBe("America/Chicago");
    if (reads === 1) {
      await route.fulfill({ status: 401, json: { error: "sign_in_required" } });
      return;
    }
    const totals = (first: number) => [first, 0, ...Array(286).fill(null)];
    await route.fulfill({ json: {
      date: body.get("date"), timeZone: body.get("timeZone"), hrv: { status: "ready", value: 175.4 },
      steps: reads === 2 ? { status: "failed" } : { status: "ready", value: totals(161) },
      calories: { status: "ready", value: totals(10.428016) },
    } });
  });
  await page.reload();
  await page.getByRole("combobox", { name: "Replay source" }).selectOption("google-health");
  await page.getByLabel("Replay date").fill("2026-11-11");
  const steps = page.getByLabel("Current five-minute steps");
  const energy = page.getByLabel("Current five-minute energy rate");
  await expect(steps).toHaveText("No step data");
  await expect(energy).toHaveText("No calorie data");
  expect(reads).toBe(0);
  const load = page.getByRole("button", { name: "Load day", exact: true });
  await load.click();
  await expect(page.getByText("Sign in to load this day.", { exact: true }).first()).toBeVisible();
  await load.click();
  await expect(page.getByText("Daily HRV 175.40 ms · 35 buildings", { exact: true })).toBeVisible();
  await expect(steps).toHaveText("Step read failed");
  await expect(energy).toHaveText("2.09 kcal/min");
  await load.click();
  await expect(steps).toHaveText("161 steps");
  const time = page.getByRole("slider", { name: "Replay time" });
  await time.fill("300");
  await expect(steps).toHaveText("0 steps");
  await expect(energy).toHaveText("0.00 kcal/min");
  await time.fill("600");
  await expect(steps).toHaveText("No step data");
  await expect(energy).toHaveText("No calorie data");
  await page.getByRole("button", { name: "Inspect skyline", exact: true }).click();
  await expect(page.getByText("Showing 30 of 35 buildings.", { exact: false })).toBeVisible();
  await page.getByLabel("Replay date").fill("2026-11-10");
  await expect(page.locator("output")).toHaveText("00:00");
  await expect(steps).toHaveText("No step data");
  expect(reads).toBe(3);
});

test("the harbor walk uses the selected interval and restores the scene after seeking", async ({ page }) => {
  const time = page.getByRole("slider", { name: "Replay time" });
  const steps = page.getByLabel("Current five-minute steps");
  const canvas = page.locator("canvas");
  const inspect = page.getByRole("button", { name: "Inspect steps" });
  const card = page.getByRole("complementary", { name: "Harbor steps" });
  const close = page.getByRole("button", { name: "Close step details" });
  await page.getByRole("combobox", { name: "Scene view" }).selectOption("walk");
  await expect(steps).toHaveText("0 steps");
  await time.fill("28800");
  await inspect.click();
  await expect(card.getByText("08:00–08:05", { exact: true })).toBeVisible();
  await expect(card.getByText("2", { exact: true })).toBeVisible();
  await close.click();

  await time.fill("43200");
  await expect(steps).toHaveText("435 steps");
  await inspect.click();
  await expect(card.getByText("6", { exact: true })).toBeVisible();
  await close.click();
  const noon = await canvas.screenshot();
  await time.fill("54000");
  await expect(steps).toHaveText("No step data");
  await time.fill("43200");
  expect((await canvas.screenshot()).equals(noon)).toBe(true);
  await expect(page.locator("output")).toHaveText("12:00");
});

test("road traffic follows total energy, distinguishes missing records and restores its daily roster", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  const time = page.getByRole("slider", { name: "Replay time" });
  const rate = page.getByLabel("Current five-minute energy rate");
  const canvas = page.locator("canvas");
  const inspect = page.getByRole("button", { name: "Inspect traffic" });
  const card = page.getByRole("complementary", { name: "Harbor traffic" });
  const close = page.getByRole("button", { name: "Close traffic details" });
  await page.getByRole("combobox", { name: "Scene view" }).selectOption("road");
  await expect(page.getByLabel("Current five-minute steps")).toHaveText("0 steps");
  await inspect.click();
  await expect(card.getByText("1", { exact: true })).toBeVisible();
  await close.click();
  await time.fill("43200");
  await inspect.click();
  await expect(card.getByText("22.50 kcal", { exact: true })).toBeVisible();
  await expect(card.getByText("4", { exact: true })).toBeVisible();
  await close.click();
  await page.getByRole("button", { name: "Night", exact: true }).click();
  const noon = await canvas.screenshot();
  expect((await canvas.screenshot()).equals(noon)).toBe(true);
  await time.fill("43223");
  expect((await canvas.screenshot()).equals(noon)).toBe(false);
  await time.fill("54000");
  await expect(rate).toHaveText("No calorie data");
  await inspect.click();
  await expect(card.getByText("0", { exact: true })).toBeVisible();
  await close.click();
  const date = page.getByRole("combobox", { name: "Replay date" });
  await date.selectOption("2026-11-14");
  await time.fill("18000");
  await expect(rate).toHaveText("0.00 kcal/min");
  await date.selectOption("2026-11-15");
  await time.fill("43200");
  expect((await canvas.screenshot()).equals(noon)).toBe(true);
  expect(errors).toEqual([]);
});

test("returns from the square to the crossing with the same queue and walking pose", async ({ page }) => {
  const view = page.getByRole("combobox", { name: "Scene view" });
  const time = page.getByRole("slider", { name: "Replay time" });
  await page.getByRole("combobox", { name: "Replay date" }).selectOption("2026-11-14");
  await expect(page.getByText("Synthetic daily HRV 12.80 ms · 2 buildings")).toBeVisible();
  await view.selectOption("walk");
  await time.fill("64608");
  const canvas = page.locator("canvas");
  const crossing = await canvas.screenshot();
  for (const [value, title] of [["square", "Market square"], ["side", "Return lane"]]) {
    await view.selectOption(value!);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Inspect steps" })).toBeVisible();
    expect((await canvas.screenshot()).equals(crossing)).toBe(false);
  }
  await time.fill("66900");
  await view.selectOption("walk");
  await time.fill("64608");
  expect((await canvas.screenshot()).equals(crossing)).toBe(true);
});
