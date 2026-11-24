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
  await time.fill("84600");await expect(page.getByText("Light sleep · Synthetic sleep")).toBeVisible();
  await date.selectOption("2026-11-12");
  const canvas=page.locator("canvas");
  const capture=async()=>{
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))));
    return canvas.screenshot({style:".world > :not(.scene-canvas){visibility:hidden!important}"});
  };
  await time.fill("1800");await expect(page.getByText("Deep sleep · Synthetic sleep")).toBeVisible();
  const direct=await capture();
  for(const [seconds,stage] of [["7200","REM sleep"],["11040","Awake"],["25200","Returning"]] as const){
    await time.fill(seconds);await expect(page.getByText(stage+" · Synthetic sleep")).toBeVisible();
  }
  await time.fill("1800");
  expect((await capture()).equals(direct)).toBe(true);
  await page.waitForTimeout(1000);
  expect((await capture()).equals(direct)).toBe(true);
  expect(errors).toEqual([]);
});

test("revealed stage water, the awakening marker and the island open their own records",async({page})=>{
  const {OrthographicCamera,Vector3}=await import("three");
  const {routeFrame}=await import("../../src/scene/sleep/route.ts");
  const {routeDistanceAt}=await import("../../src/scene/sleep/timeline.ts");
  const {SYNTHETIC_SESSION:session}=await import("../../src/scene/sleep/session.ts");
  const {islandShape}=await import("../../src/scene/sleep/island-shape.ts");
  const {addCameraClearance}=await import("../../src/scene/camera-depth.ts");
  await page.route("**/*",r=>new URL(r.request().url()).origin==="http://127.0.0.1:8787"?r.continue():r.abort());
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  const models=Promise.all(["sleep-world","sea-life"].map(n=>page.waitForResponse(r=>r.ok()&&r.url().endsWith(n+".glb"))));
  await page.getByLabel("Replay date").selectOption("2026-11-12");await models;
  await page.getByLabel("Scene view").selectOption("sleep-route");
  const time=page.getByRole("slider",{name:"Replay time",exact:true}),canvas=page.locator("canvas");
  const bounds=(await canvas.boundingBox())!;
  const camera=new OrthographicCamera(-bounds.width/2,bounds.width/2,bounds.height/2,-bounds.height/2,.1,880);
  const target=new Vector3(108,0,0);
  camera.position.copy(target).add(new Vector3(9,120,92));addCameraClearance(camera.position,target);
  camera.zoom=Math.min(bounds.width/245,bounds.height/104);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  async function click(x:number,y:number,z:number){
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    const p=new Vector3(x,y,z).project(camera);
    await page.mouse.click(bounds.x+(1+p.x)*bounds.width/2,bounds.y+(1-p.y)*bounds.height/2);
  }
  const land=islandShape(session);
  await time.fill("1800");await click(land.center[0],3,land.center[1]);await expect(page.getByRole("complementary",{name:"Sleep island"})).toHaveCount(0);
  await time.fill("11040");
  const deep=routeFrame(routeDistanceAt(session,5500));
  await click(deep.x,.03,deep.z);await expect(page.getByRole("heading",{name:"Deep sleep"})).toBeVisible();
  await expect(page.getByText("85 min",{exact:true})).toBeVisible();await page.getByLabel("Close sleep details").click();
  const p=routeFrame(routeDistanceAt(session,14400));
  await click(p.x+3*p.nx,.53,p.z+3*p.nz);
  await expect(page.getByRole("heading",{name:"Awakening buoy"})).toBeVisible();
  await expect(page.getByText("8 min awake")).toBeVisible();await page.getByLabel("Close sleep details").click();
  await time.fill("25200");await click(land.center[0],3,land.center[1]);
  await expect(page.getByRole("heading",{name:"Sleep island"})).toBeVisible();
  await expect(page.getByText("1,061 m² · 2.4 m² per asleep minute")).toBeVisible();
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeVisible();
});
