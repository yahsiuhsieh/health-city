import {expect,test} from "@playwright/test";

test("inspects an interim shop and pauses the 27.4 ms replay",async({page})=>{
  await page.route("**/*",r=>new URL(r.request().url()).origin==="http://127.0.0.1:8787"?r.continue():r.abort());
  await page.goto("/?reviewPlot=5");
  await expect(page.getByText("Synthetic daily HRV 27.40 ms · 5 buildings")).toBeVisible();
  const play=page.getByRole("button",{name:"Play",exact:true});
  await expect(play).toBeEnabled({timeout:20000});
  const box=(await page.locator("canvas").boundingBox())!;
  const x=box.x+box.width*.49,y=box.y+box.height*.49;
  await play.click();
  await page.mouse.click(x,y);
  const card=page.getByRole("complementary",{name:"HRV plot"});
  await expect(card.getByText("A tower stands here when daily HRV is at least 30 ms.")).toBeVisible();
  await expect(card.getByText("Today: 27.40 ms · 5 towers")).toBeVisible();
  await expect(play).toBeVisible();
  await page.getByRole("button",{name:"Close plot details"}).click();
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+20,y+8,{steps:5});await page.mouse.up();
  await expect(card).toHaveCount(0);
  const view=page.getByRole("combobox",{name:"Scene view"}),date=page.getByRole("combobox",{name:"Replay date"});
  await view.selectOption("world");await view.selectOption("skyline");
  await date.selectOption("2026-11-12");
  await expect(page.getByText("No HRV data",{exact:true})).toBeVisible();
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.locator("canvas").click({position:{x:box.width*.50,y:box.height*.60}});
  await expect(card.getByText("No HRV data")).toBeVisible();
  await expect(card.getByText("A tower stands here when daily HRV is at least 30 ms.")).toBeVisible();
});
