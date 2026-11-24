import {expect,test} from "@playwright/test";

test("reviews both states of the two waterfront plots and restores the crossing after a seek",async({page})=>{
  await page.route("**/*",route=>new URL(route.request().url()).origin==="http://127.0.0.1:8787"?route.continue():route.abort());
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  const models = Promise.all(["city-working-boat", "harbor-fleet", "cargo-berth"].map(name =>
    page.waitForResponse(r => r.url().endsWith("/models/"+name+".glb") && r.ok())
  ));
  await page.goto("/?citySlice=1");
  await models;
  const view=page.getByRole("combobox",{name:"Scene view"}),date=page.getByRole("combobox",{name:"Replay date"});
  const canvas=page.locator("canvas"),time=page.getByRole("slider",{name:"Replay time",exact:true});
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled({timeout:15000});
  await expect(page.getByRole("heading",{name:"Waterfront block"})).toBeVisible();
  await expect(page.getByText("Synthetic daily HRV 27.40 ms · 5 buildings")).toBeVisible();
  async function frame(){
    await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
    return canvas.screenshot();
  }
  const interimPlots=await frame();
  await date.selectOption("2026-11-11");await expect(page.getByText("Synthetic daily HRV 103.70 ms · 20 buildings")).toBeVisible();
  expect((await frame()).equals(interimPlots)).toBe(false);
  await date.selectOption("2026-11-12");await expect(page.getByText("No HRV data",{exact:true})).toBeVisible();
  await view.selectOption("walk");await time.fill("32745");const crossing=await frame();
  await time.fill("34000");await frame();await time.fill("32745");
  expect((await frame()).equals(crossing)).toBe(true);
  await view.selectOption("harbor");
  await expect(page.getByRole("heading",{name:"Working harbor"})).toBeVisible();
  const harbor = await frame();
  await view.selectOption("cargo");
  expect((await frame()).equals(harbor)).toBe(false);
  await page.getByRole("button",{name:"Inspect berth"}).click();
  await expect(page.getByRole("heading",{name:"The cargo berth"})).toBeVisible();
  await expect(time).toHaveValue("32745");
  expect(errors).toEqual([]);
});
