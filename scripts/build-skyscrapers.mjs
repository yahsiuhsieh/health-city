import { writeFile } from "node:fs/promises";
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const families = {
  glass: ["#517c8e","#b1c4ca","#446b7a"],
  deco: ["#cbb99a","#dfc99e","#54696a"],
  concrete: ["#a7a69a","#c9c7b7","#536365"],
  ribbon: ["#629096","#e4e3d7","#476f76"],
  brick: ["#a06550","#d4c3a9","#415b60"],
};
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); }); }
};

for (const [family,[wall,trim,glass]] of Object.entries(families)) {
  const asset = new T.Group();
  const fabric=0, glazing=1, litGlazing=2;
  const materials=["tower-fabric","tower-window","tower-window-lit"].map((name,index)=>
    new T.MeshStandardMaterial({name,vertexColors:true,roughness:index===fabric?.82:.60}));
  for (const kind of ["lobby","podium","typical-floor","setback-floor","mechanical","crown"]) {
    const node=new T.Group(), parts=materials.map(()=>[]);
    node.name=kind;
    function piece(g,x,y,z,color,material=fabric,angle=0) {
      g.rotateY(angle);g.translate(x,y,z);
      const rgb=new T.Color(color), positions=g.attributes.position, colors=[];
      for(let i=0;i<positions.count;i++){
        const shade=(.88+.12*Math.min(1,Math.max(0,positions.getY(i))/.6))*(g.attributes.normal.getY(i)<-.5?.8:1);
        colors.push(rgb.r*shade,rgb.g*shade,rgb.b*shade);
      }
      g.setAttribute("color",new T.Float32BufferAttribute(colors,3));
      g.deleteAttribute("uv");parts[material].push(g.index?g.toNonIndexed():g);
    }
    const box=(w,h,d,x,y,z,c,material,angle)=>piece(new T.BoxGeometry(w,h,d),x,y,z,c,material,angle);
    const oval=(w,h,d,y,c)=>piece(new T.CylinderGeometry(1,1,h,40).scale(w/2,1,d/2),0,y,0,c);
    if(kind==="crown"){
      if(family==="brick"){
        box(13,.35,13,0,.175,0,trim);
        const roof=new T.ConeGeometry(1,3.45,4).rotateY(Math.PI/4).scale(8.7,1,8.7).toNonIndexed();
        roof.computeVertexNormals();
        piece(roof,0,2.075,0,"#638777");
      }else if(family==="glass"){
        const roof=new T.BoxGeometry(12,1,10),vertices=roof.attributes.position;
        for(let k=0;k<vertices.count;k++)vertices.setY(k,vertices.getY(k)>0?1.46+vertices.getX(k)*.11:0);
        roof.computeVertexNormals();piece(roof,0,0,0,wall);
        box(.22,1.95,.22,4.7,2.825,0,trim);
        for(let i=0;i<7;i++){
          const x=i*1.7-5.1, height=1.46+x*.11-.12;
          for(const z of [-5.04,5.04])box(.09,height,.10,x,height/2,z,glass);
        }
      }else if(family==="ribbon"){
        oval(17,.5,14,.25,trim);oval(11,2.9,9,1.95,glass);oval(11.5,.4,9.5,3.6,trim);
      }else{
        for(let i=0;i<3;i++)box(14-i*3,3.8/3,13-i*3,0,(i+.5)*3.8/3,0,i===2&&family==="deco"?"#aa8a58":wall);
      }
    }else if(kind==="mechanical"){
      box(14,3.5,13,0,1.75,0,wall);
      for(let i=0;i<6;i++)box(14.15,.13,13.15,0,.48+i*.52,0,glass);
      box(14.5,.3,13.5,0,3.65,0,trim);
    }else{
      const base=kind==="lobby"||kind==="podium", ribbon=family==="ribbon"&&!base;
      const w=base?19.3:18, d=w, shelf=kind==="setback-floor";
      if(ribbon){
        const bays=40;
        for(let i=0;i<bays;i++){
          const a=2*Math.PI*i/bays,b=2*Math.PI*(i+1)/bays;
          const x=9*Math.sin(a),z=8.775*Math.cos(a);
          const nextX=9*Math.sin(b),nextZ=8.775*Math.cos(b);
          const pane=(bottom,top,material)=>{
            const g=new T.BufferGeometry();
            g.setAttribute("position",new T.Float32BufferAttribute([
              x,bottom,z, nextX,bottom,nextZ, nextX,top,nextZ, x,top,z,
            ],3));
            g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
            piece(g,0,0,0,glass,material);
          };
          pane(0,.56,glazing);
          pane(.56,3.08,i%5<2?litGlazing:glazing);
          pane(3.08,3.4,glazing);
          box(.11,3.4,.14,x,1.7,z,trim,fabric,a);
        }
        oval(19.3,.4,18.3,3.6,trim);
      }else{
        const bandBottom=3.48;
        box(w,bandBottom,d,0,bandBottom/2,0,wall);
        const projected=family==="concrete"&&shelf?.95:.26;
        box(w+projected,.32,d+projected,0,3.64,0,trim);
        for(let side=0;side<4;side++){
          const angle=side*Math.PI/2,nx=Math.sin(angle),nz=Math.cos(angle);
          const columns=family==="glass"?12:family==="deco"?8:6, pitch=w/columns;
          function face(u,h,layer,width,height,depth,c,material=fabric){
            box(width,height,depth,nz*u+nx*(d/2+layer),h,-nx*u+nz*(d/2+layer),c,material,angle);
          }
          for(let i=0;i<columns;i++){
            const u=(i+.5)*pitch-w/2, entrance=kind==="lobby"&&side===0&&Math.abs(u)<2.6;
            const wh=entrance?3.28:family==="glass"?2.99:2.36;
            face(u,entrance?1.64:1.92,.025,pitch*(family==="glass"?.94:.76),wh,.07,glass,(i*7+side*3+Number(shelf))%5<2?litGlazing:glazing);
            if(family==="deco"||family==="glass")face(u-pitch*.45,bandBottom/2,.09,family==="glass"?.075:.26,bandBottom,.22,trim);
            if(family==="brick"||family==="concrete")face(u,3.19,.10,pitch*.84,.19,.28,trim);
            if(entrance)face(u,3.38,.12,pitch,.2,.28,trim);
          }
        }
        if(family==="concrete"&&!base)box(3.8,bandBottom,.54,-5.4,bandBottom/2,-8.97,wall);
      }
    }
    for(const [i,geometries] of parts.entries())if(geometries.length){
      node.add(new T.Mesh(mergeVertices(mergeGeometries(geometries)),materials[i]));
    }
    asset.add(node);
  }
  await writeFile(new URL("../public/models/tower-"+family+".glb",import.meta.url),
    new Uint8Array(await new GLTFExporter().parseAsync(asset,{binary:true})));
}
