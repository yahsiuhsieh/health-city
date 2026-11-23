import { expect,test } from "@playwright/test";

test("the synthetic voyage restores the same route after a seek",async({page})=>{
  const errors:string[]=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/*",r=>new URL(r.request().url()).origin==="http://127.0.0.1:8787"?r.continue():r.abort());
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  const date=page.getByRole("combobox",{name:"Replay date"}),view=page.getByRole("combobox",{name:"Scene view"});
  const time=page.getByRole("slider",{name:"Replay time",exact:true});
  const asset=page.waitForResponse(r=>r.url().endsWith("/models/sleep-world.glb")&&r.ok());
  await date.selectOption("2026-11-11");await asset;
  await view.selectOption("sleep-route");
  await time.fill("84600");await expect(page.getByText("LIGHT · Synthetic sleep")).toBeVisible();
  await date.selectOption("2026-11-12");
  const canvas=page.locator("canvas");
  const capture=async()=>{
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))));
    return canvas.screenshot({style:".world > :not(.scene-canvas){visibility:hidden!important}"});
  };
  await time.fill("1800");await expect(page.getByText("DEEP · Synthetic sleep")).toBeVisible();
  const direct=await capture();
  for(const [seconds,stage] of [["7200","REM"],["11040","AWAKE"],["25200","Returning"]] as const){
    await time.fill(seconds);await expect(page.getByText(stage+" · Synthetic sleep")).toBeVisible();
  }
  await time.fill("1800");
  expect((await capture()).equals(direct)).toBe(true);
  await page.waitForTimeout(1000);
  expect((await capture()).equals(direct)).toBe(true);
  expect(errors).toEqual([]);
});
