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

test("the buoy opens its record and both the boat and the island open the sleep voyage card",async({page})=>{
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
  await time.fill("1800");await click(land.center[0],3,land.center[1]);await expect(page.getByRole("complementary",{name:"Sleep voyage",exact:true})).toHaveCount(0);
  await time.fill("11040");
  await page.getByLabel("Scene view").selectOption("sleep");
  const p=routeFrame(routeDistanceAt(session,14400));
  const height=await page.evaluate(async()=>{
    const f=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
    const {_roots}=await import(f.name) as typeof import("@react-three/fiber");
    const canvas=document.querySelector("canvas")!,{scene,camera}=_roots.get(canvas)!.store.getState();
    await new Promise(requestAnimationFrame);
    const buoy=scene.getObjectByName("wake-buoy")!,point=camera.position.clone();
    let top=-Infinity,bottom=Infinity;
    buoy.traverse(obj=>{
      const mesh=obj as import("three").Mesh;
      if(!mesh.isMesh)return;
      const vertices=mesh.geometry.getAttribute("position");
      for(let i=0;i<vertices.count;i++){
        point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);
        if(point.y<0)continue;
        point.project(camera);
        top=Math.max(top,point.y);bottom=Math.min(bottom,point.y);
      }
    });
    return (top-bottom)*canvas.clientHeight/2;
  });
  expect(height).toBeGreaterThanOrEqual(24);
  test.info().annotations.push({type:"Visible buoy height",description:height.toFixed(1)+" px"});
  await click(p.x+6*p.nx,.53,p.z+6*p.nz);
  await expect(page.getByRole("heading",{name:"Awakening buoy"})).toBeVisible();
  await expect(page.getByText("8 min awake")).toBeVisible();await page.getByLabel("Close sleep details").click();
  await page.getByLabel("Scene view").selectOption("sleep-island");
  await time.fill("25200");await click(land.center[0],3,land.center[1]);
  await expect(page.getByRole("complementary",{name:"Sleep voyage",exact:true})).toBeVisible();
  await expect(page.getByText("10,608 m²")).toBeVisible();
  await page.getByRole("button",{name:"Close sleep voyage"}).click();
  await page.getByLabel("Scene view").selectOption("sleep");await time.fill("11040");
  await click(p.x,2,p.z);
  const chart=page.getByRole("complementary",{name:"Sleep voyage",exact:true});
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

const wildlifeSizes={ray:165,whale:330,shark:250,dolphin:85,booby:55,tern:38,"flying-fish":18} as const;
for(const kind of Object.keys(wildlifeSizes) as (keyof typeof wildlifeSizes)[])test("the voyage camera shows "+kind+" at its required screen size",async({page})=>{
  await page.setViewportSize({width:1250,height:870});
    const light=kind==="booby"||kind==="tern"||kind==="flying-fish";
    await page.goto(light?"/":"/?sleepCompanion="+kind);
    await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
    await page.getByLabel("Replay date").selectOption(light && kind!=="flying-fish"?"2026-11-11":"2026-11-12");
    await page.getByLabel("Scene view").selectOption("sleep");
    await page.getByRole("slider",{name:"Replay time",exact:true}).fill(kind==="flying-fish"?"9000":light?"84700":"5900");
    const lengths=await page.evaluate(async(kind)=>{
      const element=document.querySelector("canvas")!,bounds=element.getBoundingClientRect();
      const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
      const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
      const {scene,camera}=_roots.get(element)!.store.getState();
      for(let i=0;i<120 && !scene.getObjectByName("Stage wildlife");i++)await new Promise(requestAnimationFrame);
      for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);
      const target=scene.getObjectByName("Stage wildlife")!.getObjectByName(kind==="dolphin"?"Dolphin pod":kind==="flying-fish"?"Flying fish":kind)!;
      if(!target.visible)return [];
      const extents:number[]=[];
      const batch=target as import("three").InstancedMesh;
      const count=batch.isInstancedMesh?batch.count:1;
      for(let i=0;i<count;i++){
        let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
        target.traverse(obj=>{
          const mesh=obj as import("three").Mesh;
          if(!mesh.isMesh)return;
          const matrix=mesh.matrixWorld.clone(),p=camera.position.clone();
          if(batch.isInstancedMesh){const inst=matrix.clone();batch.getMatrixAt(i,inst);matrix.multiply(inst);}
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
    const extent=light?Math.max(...lengths):Math.min(...lengths);
    test.info().annotations.push({type:"projected extent",description:extent.toFixed(1)+" px"});
    expect(extent,kind).toBeGreaterThanOrEqual(wildlifeSizes[kind]);
});

test("the sleep voyage card follows replay, selection and scroll reveal",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  const date=page.getByLabel("Replay date"),time=page.getByRole("slider",{name:"Replay time",exact:true});
  await date.selectOption("2026-11-11");await page.getByLabel("Scene view").selectOption("sleep");
  await time.fill("82700");await page.getByRole("button",{name:"Inspect sleep voyage"}).click();
  await page.getByRole("button",{name:"Open sleep voyage"}).click();
  const card=page.getByRole("complementary",{name:"Sleep voyage",exact:true});
  const track=card.getByRole("group",{name:"Sleep stage timeline"}),segments=track.getByRole("button");
  const close=card.getByRole("button",{name:"Close sleep voyage"});
  await expect(close).toBeFocused();
  expect(await close.evaluate(el=>el.matches(":focus-visible"))).toBe(false);
  expect(await card.getByRole("heading").allTextContents()).toEqual(["Night of Wed, Nov 11","Stages","Timeline","Route","Details"]);
  await expect(segments).toHaveCount(0);
  await time.fill("84600");await expect(segments).toHaveCount(1);
  await expect(card.locator(".hero-value")).toContainText("0 h 30 min");
  await expect(card.locator(".hero-value")).toContainText("asleep so far");
  await time.fill("86390");await page.getByRole("button",{name:"Play",exact:true}).click();
  await expect(date).toHaveValue("2026-11-12");await page.getByRole("button",{name:"Pause",exact:true}).click();
  await time.fill("11040");await expect(segments).toHaveCount(5);
  await expect(card.locator(".future")).toBeVisible();
  await expect(card.locator(".lower")).toHaveCSS("opacity","0.35");
  await segments.nth(2).focus();await expect(track.getByRole("tooltip")).toContainText("REM · 01:25–02:05");
  await expect(track.locator("..")).toHaveCSS("opacity","1");
  await page.keyboard.press("Enter");await expect(card.locator(".status")).toContainText("40 min");
  await expect(card.locator(".selection-ring")).toHaveCount(1);
  await card.getByRole("button",{name:"Clear"}).click();await expect(card.locator(".selection-ring")).toHaveCount(0);
  await segments.last().click();
  const marker=card.locator(".chart-boat"),atAnchor=await marker.getAttribute("transform");
  await time.fill("11265");await expect(marker).toHaveAttribute("transform",atAnchor!);
  await time.fill("1800");await expect(segments).toHaveCount(2);await expect(card.locator(".status")).toContainText("Deep");
  await time.fill("23400");await expect(segments).toHaveCount(9);await expect(card.locator(".future")).toHaveCount(0);
  const atIsland=await marker.getAttribute("transform");await time.fill("28000");await expect(marker).not.toHaveAttribute("transform",atIsland!);
  await expect(card.getByRole("row",{name:"Light 202 min 45.7%"})).toHaveCount(1);
  await expect(card.getByRole("row",{name:"Deep 150 min 33.9%"})).toHaveCount(1);
  await expect(card.getByRole("row",{name:"REM 90 min 20.4%"})).toHaveCount(1);
  await expect(card.getByText("Unclassified")).toHaveCount(0);
  await card.evaluate(el=>el.scrollTop=el.scrollHeight);await expect(card.locator(".lower")).toHaveCSS("opacity","1");
  await page.emulateMedia({reducedMotion:"reduce"});
  await card.evaluate(el=>el.scrollTop=0);await expect(card.locator(".lower")).toHaveCSS("filter","none");
  expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await segments.first().focus();await page.keyboard.press("Shift+Tab");await expect(close).toBeFocused();
  expect(await close.evaluate(el=>el.matches(":focus-visible"))).toBe(true);
  await time.focus();await page.keyboard.press("Escape");await expect(card).toHaveCount(0);
});

test("the world view includes the island only on voyage dates",async({page})=>{
  const {coast}=await import("../../src/scene/coastline.ts");
  const {breakwaterArms}=await import("../../src/scene/city/harbor-plan.ts");
  const {islandShape}=await import("../../src/scene/sleep/island-shape.ts");
  const {outerReef}=await import("../../src/scene/sleep/outer-reef.ts");
  const {SYNTHETIC_SESSION}=await import("../../src/scene/sleep/session.ts");
  const island=islandShape(SYNTHETIC_SESSION);
  const outlines=[...coast.map(p=>p.crest),...breakwaterArms.flat(),...outerReef.vertices,...island.reef.polygon];
  await page.goto("/");
  const date=page.getByLabel("Replay date"),view=page.getByLabel("Scene view");
  for(const [day,hasIsland] of [["2026-11-12",true],["2026-11-14",false]] as const){
    await date.selectOption(day);await view.selectOption("world");
    await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
    const extent=await page.evaluate(async points=>{
      for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);
      const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
      const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
      const {camera}=_roots.get(document.querySelector("canvas")!)!.store.getState();
      return Math.max(...points.map(([x,z])=>{
        const p=camera.position.clone().set(x,0,z).project(camera);
        return Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z));
      }));
    },hasIsland?outlines:[island.center]);
    if(hasIsland)expect(extent).toBeLessThan(1);
    else expect(extent).toBeGreaterThan(1);
  }
});


test("hides the destination seabed during the reef passage and restores it on arrival",async({page})=>{
  const shaderErrors:string[]=[];
  page.on("console",message=>{
    if(message.type()==="error" && message.text().includes("Shader Error"))shaderErrors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  await page.getByLabel("Replay date").selectOption("2026-11-12");
  await page.getByLabel("Scene view").selectOption("sleep-island");
  const time=page.getByRole("slider",{name:"Replay time",exact:true});
  for(const [seconds,visible] of [["5222",false],["23800",true],["5222",false]] as const){
    await time.fill(seconds);
    await expect.poll(()=>page.evaluate(async()=>{
      const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"));
      if(!fiber)return [];
      const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
      const scene=_roots.get(document.querySelector("canvas")!)?.store.getState().scene;
      return ["Destination island","Destination seabed"].map(name=>scene?.getObjectByName(name)?.visible);
    })).toEqual([visible,visible]);
  }
  expect(shaderErrors).toEqual([]);
});

test("the scroll reveal fallback respects focus, reduced motion and a card that fits",async({page})=>{
  await page.addInitScript(()=>{
    const supports=CSS.supports.bind(CSS);
    CSS.supports=(...args:[string,string?])=>args[0]==="animation-timeline: view()"?false:
      args.length===1?supports(args[0]):supports(args[0],args[1]!);
  });
  await page.setViewportSize({width:390,height:844});await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  await page.getByLabel("Replay date").selectOption("2026-11-12");await page.getByLabel("Scene view").selectOption("sleep");
  await page.getByRole("slider",{name:"Replay time",exact:true}).fill("23400");
  await page.getByRole("button",{name:"Inspect sleep voyage"}).click();
  await page.getByRole("button",{name:"Open sleep voyage"}).click();
  const card=page.getByRole("complementary",{name:"Sleep voyage",exact:true}),lower=card.locator(".lower");
  await expect(lower).toHaveCSS("opacity","0.35");
  await card.evaluate(el=>el.scrollTop=el.scrollHeight);await expect(lower).toHaveCSS("opacity","1");
  await card.evaluate(el=>el.scrollTop=0);
  await card.locator(".segment").first().focus();await expect(card.locator(".timeline").locator("..")).toHaveCSS("opacity","1");
  await page.emulateMedia({reducedMotion:"reduce"});await expect(lower).toHaveCSS("filter","none");
  await page.setViewportSize({width:1300,height:1550});
  await page.addStyleTag({content:".world.has-chart {height:1100px}"});
  await page.emulateMedia({reducedMotion:"no-preference"});
  await expect.poll(()=>card.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
  await expect(lower).toHaveCSS("opacity","1");
});
