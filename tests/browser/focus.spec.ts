import {expect,test} from "@playwright/test";

test("focus chips open their cards and frame the same target with either motion preference",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/");
  await page.getByRole("button",{name:/Choose replay date/}).click();
  await page.getByRole("combobox",{name:"Replay date"}).selectOption("2026-11-12");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled({timeout:20000});
  const nav=page.getByRole("navigation",{name:"Camera focus"});
  const clock=page.getByRole("slider",{name:"Replay time",exact:true});
  await clock.fill("6500");
  const measure=()=>page.evaluate(async()=>{
    const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
    const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
    const el=document.querySelector("canvas")!,{camera}=_roots.get(el)!.store.getState();
    const point=camera.position.clone().set(-225,15,0).project(camera),rect=el.getBoundingClientRect();
    return {x:rect.x+(point.x+1)*rect.width/2,y:rect.y+(1-point.y)*rect.height/2,zoom:camera.zoom};
  });
  const shots=[];
  for(const mode of ["no-preference","reduce"] as const){
    await page.emulateMedia({reducedMotion:mode});
    await nav.getByRole("button",{name:"Heart",exact:true}).click();
    const card=page.getByRole("complementary",{name:"Heart rate"});
    await expect(card).toBeVisible();
    const box=(await card.boundingBox())!;
    const canvas=(await page.locator("canvas").boundingBox())!;
    const available=box.x-canvas.x-12;
    const staticZoom=Math.min(available/164,canvas.height/58);
    const staticX=canvas.x+available/2,staticY=canvas.y+canvas.height/2;
    await expect.poll(async()=>{
      const pose=await measure();
      return Math.max(Math.abs(pose.zoom-staticZoom),Math.abs(pose.x-staticX),Math.abs(pose.y-staticY));
    }).toBeLessThan(.005);
    const pose=await measure();expect(pose.x).toBeLessThan(box.x);shots.push(pose);
    expect(await clock.inputValue()).toBe("6500");
    await nav.getByRole("button",{name:"World",exact:true}).click();
    await expect(card).toBeHidden();
  }
  expect(shots[0]!.x).toBeCloseTo(shots[1]!.x,1);
  expect(shots[0]!.y).toBeCloseTo(shots[1]!.y,1);
});

test("mobile focus leaves the target above the card and accepts wheel input during a flight",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled({timeout:25000});
  const nav=page.getByRole("navigation",{name:"Camera focus"});
  await nav.getByRole("button",{name:"Heart",exact:true}).click();
  const card=page.getByRole("complementary",{name:"Heart rate"});
  const sheet=(await card.boundingBox())!,canvas=(await page.locator("canvas").boundingBox())!;
  const pose=()=>page.evaluate(async()=>{
    const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
    const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
    const el=document.querySelector("canvas")!,{camera}=_roots.get(el)!.store.getState();
    const v=camera.position.clone().set(-225,15,0).project(camera),rect=el.getBoundingClientRect();
    return {y:rect.y+(1-v.y)*rect.height/2,zoom:camera.zoom};
  });
  const freeHeight=sheet.y-canvas.y-8;
  await expect.poll(async()=>Math.abs((await pose()).y-canvas.y-freeHeight/2)).toBeLessThan(1);
  await nav.getByRole("button",{name:"World",exact:true}).click();
  await page.mouse.move(canvas.x+canvas.width*.65,canvas.y+canvas.height*.56);
  await page.mouse.wheel(0,-80);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const stopped=await pose();
  await page.waitForTimeout(1900);
  expect(await pose()).toEqual(stopped);
});

test("the glass shell keeps the chart period and restores keyboard focus",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await page.getByRole("button",{name:"Settings"}).click();
  await expect(page.getByRole("combobox",{name:"Data source"})).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("6");
  const period=page.getByRole("tablist",{name:"Chart period"});
  await period.getByRole("tab",{name:"Today"}).focus();
  await page.keyboard.press("ArrowRight");
  await expect(period.getByRole("tab",{name:"7 days"})).toHaveAttribute("aria-selected","true");
  await page.keyboard.press("7");
  const energy=page.getByRole("complementary",{name:"Energy"});
  await expect(energy.getByRole("heading",{name:"Last 7 days"})).toBeVisible();
  await expect(energy.getByText("Show data",{exact:true})).toHaveCount(0);
  await energy.getByRole("img").focus();
  await page.keyboard.press("Home");
  await expect(energy.locator(".chart-reading")).toContainText("Nov 8");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-chip=energy]")).toBeFocused();
  await expect(energy).toBeHidden();
});

test("a failed history read leaves the recorded day usable and supports retry",async({page})=>{
  const {syntheticWeek}=await import("../../src/core/synthetic-week.ts");
  const {emptyDay}=await import("../../src/worker/metric-history.ts");
  const {dayWindow}=await import("../../src/worker/health-data.ts");
  let reads=0;
  await page.route("**/api/replay/daily-hrv*",r=>r.fulfill({json:{googleHealthEnabled:true,hrv:{source:"synthetic",date:new URL(r.request().url()).searchParams.get("date"),rmssdMs:12}}}));
  await page.route("**/api/replay/day",r=>{
    const body=new URLSearchParams(r.request().postData()!);
    const day=emptyDay(dayWindow(body.get("date")!,body.get("timeZone")!)!);
    return r.fulfill({json:{...day,rhr:{status:"ready",value:[{bpm:61,method:null}]}}});
  });
  await page.route("**/api/summary/week",r=>{
    const date=new URLSearchParams(r.request().postData()!).get("date")!;
    return ++reads===1?r.fulfill({status:503,body:""}):r.fulfill({json:syntheticWeek(date)});
  });
  await page.goto("/");
  await page.getByRole("button",{name:"Settings"}).click();
  await page.getByRole("combobox",{name:"Data source"}).selectOption("google");
  await page.keyboard.press("Escape");
  await page.locator("[data-chip=rhr]").click();
  const card=page.getByRole("complementary",{name:"Resting heart rate"});
  await expect(card.locator(".metric-value")).toContainText("61");
  await card.getByRole("button",{name:"Retry"}).click();
  await expect(card.getByRole("img")).toBeVisible();
  expect(reads).toBe(2);
});

test("the reservoir keeps its daily level and camera through replay and date changes",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled({timeout:30000});
  await page.locator("[data-chip=rhr]").click();
  const card=page.locator("[data-metric=rhr]");
  const state=()=>page.evaluate(async()=>{
    const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
    const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
    const {scene,camera}=_roots.get(document.querySelector("canvas")!)!.store.getState();
    const reservoir=scene.getObjectByName("Ridge saddle reservoir")!;
    const water=reservoir.getObjectByName("Reservoir water") as import("three").Mesh|undefined;
    return {level:water?.geometry.getAttribute("position").getY(0),pose:[...camera.position.toArray(),camera.zoom],
      envelope:!!reservoir.getObjectByName("Capacity envelope"),jet:reservoir.getObjectByName("Outlet release")!.scale.x};
  });
  await expect(card.locator(".metric-value")).toContainText("58");
  await page.waitForTimeout(350);
  const initial=await state();
  expect(initial.level).toBeCloseTo(11.2);
  await page.getByRole("slider",{name:"Replay time"}).fill("3000");
  await expect.poll(async()=>(await state()).jet).not.toBe(initial.jet);
  const paused=await state();
  await page.waitForTimeout(250);
  expect(await state()).toEqual(paused);
  await page.getByRole("button",{name:"Previous day"}).click();
  await expect(card.getByText("No RHR data")).toBeVisible();
  expect(await state()).toMatchObject({envelope:true,pose:paused.pose});
  await page.getByRole("button",{name:"Previous day"}).click();
  await expect(card.locator(".metric-value")).toContainText("60");
  await expect.poll(async()=>(await state()).level).toBe(12);
  await page.getByRole("button",{name:"Previous day"}).click();
  await expect(card.getByText(/Outside the gauge range/)).toBeVisible();
  expect((await state()).level).toBe(20);
});

test("all dock chips support keyboard inspection and a visible focus ring",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  const keys=["world","sleep","heart","hrv","rhr","steps","energy"];
  await page.locator('[data-chip=world]').focus();
  for(const [i,key] of keys.entries()){
    const chip=page.locator('[data-chip="'+key+'"]');
    await page.keyboard.press(i===0?"Shift":"Tab");
    await expect(chip).toBeFocused();
    await expect(chip).toHaveAccessibleName(new RegExp("^"+key+"$","i"));
    expect(await chip.evaluate(el=>el.matches(":focus-visible")&&parseFloat(getComputedStyle(el).outlineWidth)>=2)).toBe(true);
    if(key==="world")continue;
    await page.keyboard.press("Enter");
    await expect(page.locator("aside")).toHaveAttribute("data-metric",key);
    await page.keyboard.press("Escape");
    await expect(chip).toBeFocused();
  }
});

test("switching dates and closing a card preserve a manually adjusted metric view",async({page})=>{
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  await page.locator("[data-chip=steps]").click();
  await page.waitForTimeout(400);
  await page.mouse.move(405,340);await page.mouse.down();await page.mouse.move(470,365,{steps:5});await page.mouse.up();
  await page.mouse.wheel(0,-85);
  const pose=()=>page.evaluate(async()=>{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
    const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
    const {camera}=_roots.get(document.querySelector("canvas")!)!.store.getState();
    return [...camera.matrixWorld.elements,...camera.projectionMatrix.elements];
  });
  const before=await pose();
  await page.getByRole("button",{name:"Previous day"}).click();
  await expect(page.getByLabel("Replay clock")).toHaveText("00:00");
  await expect(page.locator("aside")).toHaveAttribute("data-metric","steps");
  await page.waitForTimeout(350);
  expect(await pose()).toEqual(before);
  await page.keyboard.press("Escape");
  await expect(page.locator("aside")).toBeHidden();
  await page.waitForTimeout(350);
  expect(await pose()).toEqual(before);
  await page.getByRole("button",{name:"Play",exact:true}).click();
  await page.locator("[data-chip=world]").click();
  await expect(page.getByRole("button",{name:"Pause",exact:true})).toBeVisible();
});

test("metric charts, card readings and scene objects use the selected replay data",async({page})=>{
  const {SYNTHETIC_DAYS,stepsAt,trafficAt}=await import("../../src/core/representative-day.ts");
  const {asleepSeconds}=await import("../../src/core/sleep-replay.ts");
  const {SYNTHETIC_SESSION}=await import("../../src/scene/sleep/session.ts");
  const {ridgeLength,elevation}=await import("../../src/scene/ridge-profile.ts");
  const day=SYNTHETIC_DAYS[0]!,seconds=43200;
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  const clock=page.getByRole("slider",{name:"Replay time"});
  await clock.fill(String(seconds));
  const card=page.locator(".metric-card"),hero=card.locator(".metric-value"),reading=card.locator(".chart-reading strong");
  for(const key of ["heart","hrv","rhr","steps","energy","sleep"]){
    if(key==="sleep"){
      await page.getByRole("button",{name:/Choose replay date/}).click();
      await page.getByLabel("Replay date",{exact:true}).selectOption("2026-11-12");
      await clock.fill(String(seconds));
    }
    await page.locator('[data-chip="'+key+'"]').click();
    await expect(card).toHaveAttribute("data-metric",key);
    const scene=await page.evaluate(async z=>{
      const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
      const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
      const {scene}=_roots.get(document.querySelector("canvas")!)!.store.getState();
      const water=scene.getObjectByName("Reservoir water") as import("three").Mesh|undefined;
      const count=(name:string)=>scene.getObjectByName(name)!.children.filter(obj=>obj.visible).length;
      const ground=scene.getObjectByName("Heart-rate mountains")!.children[0] as import("three").Mesh;
      const points=ground.geometry.getAttribute("position");let crest=0;
      for(let i=0;i<points.count;i++)if(Math.abs(points.getZ(i)-z)<.001)crest=Math.max(crest,points.getY(i));
      const cay=scene.getObjectByName("Coral cay") as import("three").Mesh|undefined;
      let area=0;
      if(cay){
        const vertices=cay.geometry.getAttribute("position"),indices=cay.geometry.index!;
        for(let i=0;i<indices.count;i+=3){
          const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);
          area+=Math.abs((vertices.getX(b)-vertices.getX(a))*(vertices.getZ(c)-vertices.getZ(a))-
            (vertices.getX(c)-vertices.getX(a))*(vertices.getZ(b)-vertices.getZ(a)))/2;
        }
      }
      return {water:water?.geometry.getAttribute("position").getY(0),towers:scene.getObjectByName("HRV skyline")!.children.filter(o=>o.name.startsWith("HRV tower ")).length,
        people:count("Harbor walk"),cars:count("Harbor road"),crest,area};
    },(.5-144.5/day.heartMeans.length)*ridgeLength);
    if(key==="steps"||key==="energy"){
      await card.getByRole("tab",{name:"Today"}).click();
      const buckets=key==="steps"?day.stepTotals:day.calorieTotals;
      const total=(a:(number|null)[])=>a.reduce<number>((n,v)=>n+(v??0),0).toLocaleString("en-US",{maximumFractionDigits:2});
      await expect(hero).toHaveText(total(buckets.slice(0,144))+(key==="steps"?"steps":"kcal"));
      await expect(reading).toContainText(total(buckets.slice(144,156)));
      if(key==="steps")expect(scene.people).toBe(stepsAt(day,seconds).pedestrianCount);
      else expect(scene.cars).toBe(trafficAt(day,seconds).vehicleCount);
      await clock.fill(String(day.durationSeconds));await card.getByRole("tab",{name:"7 days"}).click();
      await expect(reading).toContainText(total(buckets));await expect(hero).toContainText(total(buckets));
      await clock.fill(String(seconds));
    }else if(key==="heart"){
      await expect(hero).toHaveText(day.heartMeans[144]+"bpm");await expect(reading).toContainText(String(day.heartMeans[144]));
      expect(scene.crest).toBeCloseTo(elevation(day.heartMeans[144]!),3);
    }else if(key==="sleep"){
      await card.getByRole("tab",{name:"7 days"}).click();
      const minutes=asleepSeconds(SYNTHETIC_SESSION)/60,display=Math.floor(minutes/60)+" h "+minutes%60+" min";
      await expect(hero).toHaveText(display);await expect(reading).toContainText(display);expect(scene.area).toBeCloseTo(minutes*10,1);
    }else{
      const value=key==="hrv"?"27.4":"58";
      await expect(hero).toHaveText(value+(key==="hrv"?"ms":"bpm"));await expect(reading).toContainText(value);
      if(key==="hrv")expect(scene.towers).toBe(5);else expect(scene.water).toBeCloseTo(11.2);
    }
  }
});
