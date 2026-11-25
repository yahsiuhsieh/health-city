import { readFile } from "node:fs/promises";
import { Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { expect,test } from "@playwright/test";
import { animalDeformation,animalMotion } from "../../src/scene/sleep/animal-motion.ts";

test("the animated skin moves the tail or wingtip while the head stays fixed",async({page})=>{
  const examples=[
    {kind:"whale",size:16},{kind:"shark",size:12},{kind:"dolphin",size:4},{kind:"ray",size:8},
    {kind:"booby",size:2.8},{kind:"tern",size:1.8},{kind:"flying-fish",size:.9},
  ] as const;
  const bytes=await readFile("public/models/sea-life.glb");
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
  for(const {kind,size} of examples){
    const wing=kind==="ray"||kind==="booby"||kind==="tern";
    const vertices:{x:number;y:number;z:number;along:number}[]=[];
    scene.getObjectByName(kind)!.traverse(obj=>{
      if(!(obj instanceof Mesh))return;
      const pos=obj.geometry.getAttribute("position"),weights=obj.geometry.getAttribute("_along");
      for(let i=0;i<pos.count;i++)vertices.push({x:pos.getX(i),y:pos.getY(i),z:pos.getZ(i),along:weights.getX(i)});
    });
    const head=vertices.reduce((a,b)=>a.x>b.x?a:b);
    const tip=vertices.reduce((a,b)=>wing?(a.z>b.z?a:b):(a.x<b.x?a:b));
    const displacement=await page.evaluate(({kind,frequency,body,head,tip})=>{
      const gl=new OffscreenCanvas(2,2).getContext("webgl2")!;
      function shader(type:number,source:string){
        const result=gl.createShader(type)!;gl.shaderSource(result,source);gl.compileShader(result);
        if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(result)!);
        return result;
      }
      const program=gl.createProgram()!;
      const vector=(p:typeof head)=>[p.x,p.y,p.z].map(v=>v.toFixed(6)).join(",");
      gl.attachShader(program,shader(gl.VERTEX_SHADER,`#version 300 es
        precision highp float;
        uniform float animalTime;
        out vec3 delta;
        void main(){
          float _along=gl_VertexID==0?${head.along.toFixed(6)}:${tip.along.toFixed(6)};
          float offset=0.,launchBeat=1.;
          vec3 position=gl_VertexID==0?vec3(${vector(head)}):vec3(${vector(tip)});
          vec3 transformed=position;
          ${body}
          delta=transformed-position;gl_Position=vec4(0.,0.,0.,1.);
        }`));
      gl.attachShader(program,shader(gl.FRAGMENT_SHADER,"#version 300 es\nprecision highp float;out vec4 c;void main(){c=vec4(1.);}"));
      gl.transformFeedbackVaryings(program,["delta"],gl.INTERLEAVED_ATTRIBS);
      gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program)!);
      gl.useProgram(program);gl.enable(gl.RASTERIZER_DISCARD);
      const buffer=gl.createBuffer()!;gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);
      gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,24,gl.STREAM_READ);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
      function sample(time:number){
        gl.uniform1f(gl.getUniformLocation(program,"animalTime"),time);
        gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,2);gl.endTransformFeedback();
        const result=new Float32Array(6);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,result);return result;
      }
      const phase=kind==="ray"?1.9+3.4*tip.along:4.1*tip.along;
      const peak=kind==="booby"||kind==="tern"?.75:(Math.PI/2+phase)/(2*Math.PI*frequency);
      const a=sample(peak),b=sample(peak+.5/frequency),rewound=sample(peak);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return {head:Math.hypot(...a.slice(0,3).map((v,i)=>v-b[i]!)),
        tip:Math.hypot(...a.slice(3).map((v,i)=>v-b[i+3]!)),repeat:a.every((v,i)=>v===rewound[i])};
    },{kind,head,tip,frequency:animalMotion[kind].frequency,body:animalDeformation(kind)});
    expect(displacement.head,kind).toBeLessThanOrEqual(size*.01);
    expect(displacement.tip,kind).toBeGreaterThanOrEqual(size*.05);
    expect(displacement.repeat).toBe(true);
  }
});

test("only emerged skin reaches the main pass and submerged skin reaches refraction",async({page})=>{
  await page.goto("/?sleepCompanion=whale");
  await expect(page.getByRole("button",{name:"Play",exact:true})).toBeEnabled();
  await page.getByLabel("Replay date").selectOption("2026-11-12");
  await page.getByLabel("Scene view").selectOption("sleep");
  const time=page.getByRole("slider",{name:"Replay time",exact:true});
  const shot=async(layer:number,clip?:{x:number;y:number;width:number;height:number})=>{
    await page.evaluate(async layer=>{
      const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
      const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
      let scene=_roots.get(document.querySelector("canvas")!)?.store.getState().scene;
      for(let i=0;!scene&&i<180;i++){await new Promise(requestAnimationFrame);scene=_roots.get(document.querySelector("canvas")!)?.store.getState().scene;}
      if(!scene)throw Error("The scene did not load.");
      let whale=scene.getObjectByName("Stage wildlife")?.getObjectByName("whale");
      for(let i=0;!whale&&i<180;i++){await new Promise(requestAnimationFrame);whale=scene.getObjectByName("Stage wildlife")?.getObjectByName("whale");}
      if(!whale?.visible)throw Error("The whale is outside its encounter.");
      whale.traverse(obj=>obj.layers.set(layer));
      for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);
    },layer);
    if(clip)return page.screenshot({clip});
    return page.locator("canvas").screenshot({style:".world > :not(.scene-canvas){visibility:hidden!important}"});
  };
  await time.fill("6450");
  const cruise=await shot(0);
  expect((await shot(2)).equals(cruise)).toBe(true);
  expect((await shot(3)).equals(cruise)).toBe(false);
  await time.fill("6333");
  const breach=await shot(0);
  expect((await shot(2)).equals(breach)).toBe(false);

  await time.fill("19700");
  await shot(0);
  const torso=await page.evaluate(async()=>{
    const fiber=performance.getEntriesByType("resource").find(e=>e.name.includes("/@react-three_fiber.js"))!;
    const {_roots}=await import(fiber.name) as typeof import("@react-three/fiber");
    const canvas=document.querySelector("canvas")!,bounds=canvas.getBoundingClientRect();
    const {camera,scene}=_roots.get(canvas)!.store.getState();
    const whale=scene.getObjectByName("Stage wildlife")!.getObjectByName("whale")!;
    const center=whale.getWorldPosition(camera.position.clone()).project(camera);
    return {x:Math.round(bounds.left+(1+center.x)*bounds.width/2)-3,
      y:Math.round(bounds.top+(1-center.y)*bounds.height/2)-3,width:6,height:6};
  });
  const submergedTorso=await shot(2,torso);
  expect((await shot(3,torso)).equals(submergedTorso)).toBe(false);
});
