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
  await view.selectOption("sleep");
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

test("the buoy opens its record and both the boat and the island open the voyage chart",async({page})=>{
  const {routeFrame}=await import("../../src/scene/sleep/route.ts");
  const {routeDistanceAt}=await import("../../src/scene/sleep/timeline.ts");
  const {SYNTHETIC_SESSION:session}=await import("../../src/scene/sleep/session.ts");
  const {islandShape}=await import("../../src/scene/sleep/island-shape.ts");
  await page.route("**/*",r=>new URL(r.request().url()).origin==="http://127.0.0.1:8787"?r.continue():r.abort());
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  const models=Promise.all(["sleep-world","sea-life"].map(n=>page.waitForResponse(r=>r.ok()&&r.url().endsWith(n+".glb"))));
  await page.getByLabel("Replay date").selectOption("2026-11-12");await models;
  const time=page.getByRole("slider",{name:"Replay time",exact:true});
  async function click(x:number,y:number,z:number){
    const position=await page.evaluate(async coords=>{
      await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
      const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
      const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
      const element=document.querySelector("canvas")!,bounds=element.getBoundingClientRect();
      const {camera}=_roots.get(element)!.store.getState();
      const p=camera.position.clone().set(...coords).project(camera);
      return {x:bounds.x+(1+p.x)*bounds.width/2,y:bounds.y+(1-p.y)*bounds.height/2};
    },[x,y,z] as [number,number,number]);
    await page.mouse.click(position.x,position.y);
  }
  const land=islandShape(session);
  await page.getByLabel("Scene view").selectOption("sleep-island");
  await time.fill("1800");await click(land.center[0],3,land.center[1]);await expect(page.getByRole("complementary",{name:"Voyage chart"})).toHaveCount(0);
  await time.fill("11040");
  await page.getByLabel("Scene view").selectOption("sleep");
  const p=routeFrame(routeDistanceAt(session,14400));
  await click(p.x+6*p.nx,.53,p.z+6*p.nz);
  await expect(page.getByRole("heading",{name:"Awakening buoy"})).toBeVisible();
  await expect(page.getByText("8 min awake")).toBeVisible();await page.getByLabel("Close sleep details").click();
  await page.getByLabel("Scene view").selectOption("sleep-island");
  await time.fill("25200");await click(land.center[0],3,land.center[1]);
  await expect(page.getByRole("complementary",{name:"Voyage chart"})).toBeVisible();
  await expect(page.getByText("10,608 m²")).toBeVisible();
  await page.getByRole("button",{name:"Close voyage chart"}).click();
  await page.getByLabel("Scene view").selectOption("sleep");await time.fill("11040");
  await click(p.x,2,p.z);
  const chart=page.getByRole("complementary",{name:"Voyage chart"});
  await expect(chart).toBeVisible();
  await expect(chart.getByRole("button",{name:/Awake · 03:00/})).toBeVisible();
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeVisible();
});

test("the rendered hull travels bow first on both harbor legs",async({page})=>{
  await page.route("**/*",r=>new URL(r.request().url()).origin==="http://127.0.0.1:8787"?r.continue():r.abort());
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  const date=page.getByLabel("Replay date"),time=page.getByRole("slider",{name:"Replay time",exact:true});
  await date.selectOption("2026-11-11");
  await page.getByLabel("Scene view").selectOption("sleep");
  async function readPose(t:number){
    await time.fill(String(t));
    return page.evaluate(async()=>{
      await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
      const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
      const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
      const {scene}=_roots.get(document.querySelector("canvas")!)!.store.getState();
      const hull=scene.getObjectByName("cargo-hull")!;
      const m=hull.matrixWorld.elements;
      return {x:m[12]!,z:m[14]!,bowX:m[0]!,bowZ:m[2]!};
    });
  }
  for(const [day,start,end] of [[11,83000,83400],[12,25800,26050],[12,27200,27450]]){
    await date.selectOption("2026-11-"+day);
    let previous=await readPose(start!);
    for(let i=1;i<=8;i++){
      const current=await readPose(Math.round(start!+(end!-start!)*i/8));
      const x=current.x-previous.x,z=current.z-previous.z;
      expect((x*current.bowX+z*current.bowZ)/Math.hypot(x,z)).toBeGreaterThan(Math.cos(Math.PI/9));
      previous=current;
    }
  }
});

test("stage animation freezes and restores the same LIGHT and REM frames",async({page})=>{
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  const date=page.getByLabel("Replay date"),time=page.getByRole("slider",{name:"Replay time",exact:true});
  await date.selectOption("2026-11-12");await page.getByLabel("Scene view").selectOption("sleep");
  await page.getByRole("button",{name:"Night",exact:true}).click();
  async function frame(t:number){
    await time.fill(String(t));
    await page.evaluate(async()=>{for(let i=0;i<5;i++)await new Promise(requestAnimationFrame);});
    return page.locator("canvas").screenshot({style:".world > :not(.scene-canvas){visibility:hidden!important}"});
  }
  for(const t of [9500,19500]){
    const original=await frame(t);
    expect((await frame(t)).equals(original)).toBe(true);
    await frame(1800);
    expect((await frame(t)).equals(original)).toBe(true);
  }
});

for(const kind of ["ray","whale","shark","dolphin"])test("the voyage camera shows "+kind+" at its required screen size",async({page})=>{
  await page.setViewportSize({width:1250,height:870});
    await page.goto("/?sleepCompanion="+kind);
    await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
    await page.getByLabel("Replay date").selectOption("2026-11-12");
    await page.getByLabel("Scene view").selectOption("sleep");
    await page.getByRole("slider",{name:"Replay time",exact:true}).fill("5900");
    const lengths=await page.evaluate(async(kind)=>{
      const element=document.querySelector("canvas")!,bounds=element.getBoundingClientRect();
      const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
      const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
      const {scene,camera}=_roots.get(element)!.store.getState();
      for(let i=0;i<120 && !scene.getObjectByName("Stage wildlife");i++)await new Promise(requestAnimationFrame);
      for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);
      const target=scene.getObjectByName("Stage wildlife")!.getObjectByName(kind==="dolphin"?"Dolphin pod":kind)!;
      if(!target.visible)return [];
      const extents:number[]=[];
      const count=kind==="dolphin"?(target as import("three").InstancedMesh).count:1;
      for(let i=0;i<count;i++){
        let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
        target.traverse(obj=>{
          const mesh=obj as import("three").Mesh;
          if(!mesh.isMesh)return;
          const matrix=mesh.matrixWorld.clone(),p=camera.position.clone();
          if(kind==="dolphin"){const inst=matrix.clone();(mesh as import("three").InstancedMesh).getMatrixAt(i,inst);matrix.multiply(inst);}
          const positions=mesh.geometry.getAttribute("position");
          for(let j=0;j<positions.count;j++){
            p.fromBufferAttribute(positions,j).applyMatrix4(matrix).project(camera);
            const x=(p.x+1)*bounds.width/2,y=(1-p.y)*bounds.height/2;
            left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
          }
        });
        extents.push(left>=0 && top>=0 && right<=bounds.width && bottom<=bounds.height?Math.max(right-left,bottom-top):0);
      }
      return extents;
    },kind);
    expect(lengths.length).toBeGreaterThan(0);
    test.info().annotations.push({type:"projected extent",description:Math.min(...lengths).toFixed(1)+" px"});
    expect(Math.min(...lengths),kind).toBeGreaterThanOrEqual(kind==="dolphin"?45:90);
});

test("the voyage chart follows replay through midnight and reveals only reached intervals",async({page})=>{
  await page.route("**/*",r=>new URL(r.request().url()).origin==="http://127.0.0.1:8787"?r.continue():r.abort());
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  const date=page.getByLabel("Replay date"),time=page.getByRole("slider",{name:"Replay time",exact:true});
  await date.selectOption("2026-11-11");await page.getByLabel("Scene view").selectOption("sleep");
  await time.fill("82700");await page.getByRole("button",{name:"Inspect sleep voyage"}).click();
  await page.getByRole("button",{name:"Open voyage chart"}).click();
  const card=page.getByRole("complementary",{name:"Voyage chart"});
  const track=card.getByRole("group",{name:"Sleep voyage track"});
  await expect(track.getByRole("button")).toHaveCount(0);
  await time.fill("84600");
  const drawn=track.locator(".chart-segment path").first(),partial=await drawn.getAttribute("d");
  await expect(track.getByRole("button")).toHaveCount(1);
  await time.fill("86390");await page.getByRole("button",{name:"Play",exact:true}).click();
  await expect(date).toHaveValue("2026-11-12");
  await page.getByRole("button",{name:"Pause",exact:true}).click();await expect(card).toBeVisible();
  await time.fill("11040");await expect(track.getByRole("button")).toHaveCount(5);
  await track.getByRole("button",{name:/REM sleep · 01:25/}).focus();
  await page.keyboard.press("Enter");await expect(card.locator(".voyage-reading")).toContainText("REM sleep · 01:25–02:05 · 40 min");
  await track.getByRole("button",{name:/Awake · 03:00/}).click();
  const marker=track.locator(".chart-boat"),atAnchor=await marker.getAttribute("transform");
  await time.fill("11265");await expect(marker).toHaveAttribute("transform",atAnchor!);
  await time.fill("1800");await expect(track.getByRole("button")).toHaveCount(2);
  await expect(track.getByRole("button",{name:/Awake/})).toHaveCount(0);
  await expect(card.locator(".voyage-reading")).toContainText("Deep sleep");
  expect(await drawn.getAttribute("d")).not.toEqual(partial);
  await time.fill("23400");await expect(track.getByRole("button")).toHaveCount(9);
  const atIsland=await marker.getAttribute("transform");await time.fill("28000");
  await expect(marker).not.toHaveAttribute("transform",atIsland!);
  await expect(track.getByRole("button")).toHaveCount(9);
  await expect(card.getByRole("row",{name:"Light 202 45.7%"})).toBeVisible();
  await expect(card.getByRole("row",{name:"Deep 150 33.9%"})).toBeVisible();
  await expect(card.getByRole("row",{name:"REM 90 20.4%"})).toBeVisible();
  await expect(card.getByRole("row",{name:"Unclassified 0 0.0%"})).toBeVisible();
  expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await card.getByRole("button",{name:"Close voyage chart"}).click();await expect(card).toHaveCount(0);
});
