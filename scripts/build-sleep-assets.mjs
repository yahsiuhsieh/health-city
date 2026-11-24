import { seaLife } from "./sleep-sea-life.mjs";
import { writeFile } from "node:fs/promises";
import * as T from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const scene = new T.Group();
const matte = new T.MeshStandardMaterial({vertexColors:true,roughness:.91,side:T.DoubleSide});
const families = {
  palm:3, broadleaf:3, shrub:2, grass:1, driftwood:1, "beach-rock":1, bommie:1,
  "coral-table":1,"coral-plate":1,"coral-boulder":1,"coral-brain":1,"coral-branch":1,
  "sponge-tubes":1,"sea-fan":1,"soft-coral":1,
  "jetty-plank":1,"jetty-pile":1,"jetty-fender":1,"jetty-bollard":1,"jetty-ladder":1,"jetty-lamp":1,
};
function model(name,variant) {
  const parts=[];
  const tilt=variant*.71;
  function add(geometry,hex){
    const g=geometry.index?geometry.toNonIndexed():geometry;
    g.deleteAttribute("uv");
    const rgb=new T.Color(hex),colors=[], n=g.attributes.normal;
    for(let i=0;i<n.count;i++){
      const shade=.87+.13*n.getY(i);
      colors.push(rgb.r*shade,rgb.g*shade,rgb.b*shade);
    }
    g.setAttribute("color",new T.Float32BufferAttribute(colors,3));parts.push(g);
  }
  function profile(rings,sides,x,y,z,hex,wave=0){
    const points=[],indices=[];
    for(const [row,[r,h]] of rings.entries())for(let i=0;i<sides;i++){
      const a=2*Math.PI*i/sides+tilt;
      const radius=r*(1+wave*.22*Math.sin(3*a+.46*row));
      points.push(x+radius*Math.cos(a),y+h+wave*r*.21*Math.sin(4*a+.4*row),z+radius*Math.sin(a));
      if(row){const k=row*sides+i,next=row*sides+(i+1)%sides;
        indices.push(k-sides,k,next-sides,next-sides,k,next);}
    }
    const g=new T.BufferGeometry();
    g.setAttribute("position",new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();add(g,hex);
  }
  function lobe(x,y,z,rx,ry,rz,color,detail=0){
    add(new T.IcosahedronGeometry(1,detail).scale(rx,ry,rz).translate(x,y,z),color);
  }
  function limb(from,to,r,tip,color,sides=6){
    const a=new T.Vector3(...from),b=new T.Vector3(...to),dir=b.clone().sub(a);
    const g=new T.CylinderGeometry(tip,r,dir.length(),sides,1,true);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize()));
    add(g.translate(...a.lerp(b,.5).toArray()),color);
  }
  function foliage(count,grass){
    for(let i=0;i<count;i++){
      const a=i*2.4+tilt,inner=i%3===0,h=grass?.5+.46*(.5+.5*Math.cos(i*1.7)):inner?.63:.42;
      const w=grass?.042:.14,r=grass?.16:inner?.11:.32,c=Math.cos(a),s=Math.sin(a);
      const vertices=[.09*c,0,.09*s,r*c+w*s,.48*h,r*s-w*c,r*c,.59*h,r*s,
        r*c-w*s,.48*h,r*s+w*c,(r+.14)*c,h,(r+.14)*s];
      const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
      g.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);g.computeVertexNormals();
      add(g,grass?(inner?"#86984f":"#718b4e"):(inner?"#cd97a1":"#b57e93"));
    }
  }
  if(name==="palm"){
    const h=8.4+variant*.9,lean=1.1+.8*variant;
    const trunk=t=>[lean*t*t,h*t,.28*Math.sin(2*t)];
    for(let i=0;i<9;i++){
      limb(trunk(i/9),trunk((i+1)/9),.33-.13*i/9,.31-.13*(i+1)/9,i%2?"#948263":"#ad9877",8);
      const p=trunk(i/9);add(new T.CylinderGeometry(.34-.13*i/9,.32-.13*i/9,.09,8).translate(...p),"#776e56");
    }
    const [cx,cy,cz]=trunk(1);
    for(let i=0;i<11+variant;i++){
      const a=i*2.4+tilt,dx=Math.cos(a),dz=Math.sin(a),length=3.3+.9*Math.sin(i*5.2);
      const blade=(u,side)=>{
        const w=.47*Math.sin(Math.PI*u)**.65*side;
        return [cx+dx*length*u-dz*w,cy+1.55*Math.sin(Math.PI*u)-(.64+.35*Math.cos(i))*u*u-.27*Math.abs(w),cz+dz*length*u+dx*w];
      };
      for(let j=0;j<7;j++){
        const start=j/7,end=(j+1)/7;
        for(const side of [-1,1]){
          const points=[blade(start,0),blade(start+.62*(end-start),side),blade(end,0)];
          const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(points.flat(),3));g.computeVertexNormals();
          add(g,side<0?"#538146":i%3?"#84a952":"#b4bd65");
        }
      }
    }
    for(let i=0;i<4;i++)lobe(cx+.25*Math.cos(i*2.4),cy-.3-.13*(i%2),cz+.25*Math.sin(i*2.4),.24,.31,.23,"#857443");
  }else if(name==="broadleaf"){
    limb([0,0,0],[.24,5.5,0],.52,.25,"#86745a",7);
    for(let i=0;i<7;i++){
      const a=2.4*i+tilt,r=i<5?2.45:.8,x=r*Math.cos(a),z=r*Math.sin(a),y=i<5?6.8+.6*Math.sin(i+tilt):8.3;
      limb([.24,3.9,0],[x,y,z],.23,.09,"#87795f");
      lobe(x,y+.55,z,2.8,1.55,2.45,["#49764b","#65905a","#598757","#78a064"][(i+variant)%4],i%3===0?1:0);
    }
  }else if(name==="grass"){
    foliage(10,true);
  }else if(name==="shrub"){
    for(let i=0;i<4;i++)lobe(.45*Math.cos(i*2.4+tilt),.48+.18*((i+variant)%2),.42*Math.sin(i*2.4+tilt),.69,.55,.64,i%2?"#92a656":"#749457",0);
  }else if(name==="beach-rock" || name==="bommie"){
    const slab=name==="beach-rock";
    lobe(0,slab?.05:-.10,0,1,slab?.12:1,slab?.55:.9,slab?"#929182":"#898d70",1);
  }else if(name==="driftwood"){
    limb([-1.4,.10,.13],[1.3,.16,-.1],.1,.065,"#a2987e");
    limb([.4,.14,0],[.85,.29,.34],.06,.018,"#938c78");
  }else if(name.startsWith("jetty-")){
    const box=(x,y,z,w,h,d,col)=>add(new T.BoxGeometry(w,h,d).translate(x,y,z),col);
    if(name==="jetty-plank")box(0,0,0,1,1,1,"#b89973");
    if(name==="jetty-pile")add(new T.CylinderGeometry(.19,.23,1,8),"#826d53");
    if(name==="jetty-fender")add(new T.TorusGeometry(.30,.105,6,12),"#475251");
    if(name==="jetty-bollard"){
      add(new T.CylinderGeometry(.16,.23,.48,8).translate(0,.24,0),"#525e59");
      box(0,.45,0,.54,.12,.23,"#57625c");
    }
    if(name==="jetty-ladder"){
      for(const x of [-.32,.32])limb([x,-2.0,0],[x,.52,0],.045,.045,"#a4aca4");
      for(let j=0;j<6;j++)limb([-.32,-1.8+.36*j,0],[.32,-1.8+.36*j,0],.035,.035,"#919f99");
    }
    if(name==="jetty-lamp"){
      limb([0,0,0],[0,2.65,0],.085,.065,"#727b71");
      box(0,2.48,0,.30,.32,.30,"#ffe5ae");box(0,2.77,0,.64,.07,.47,"#455863");
    }
  }else if(name==="sea-fan"){
    for(let i=-3;i<=3;i++){
      const x=i*.14,y=.8-Math.abs(i)*.07;
      limb([0,0,0],[x,y,.06*Math.sin(i)],.06,.028,"#c18c91",4);
      limb([x*.55,y*.55,0],[x+.13,y*.75,0],.033,.015,"#d6a4a1",4);
    }
  }else if(name==="coral-brain"){
    lobe(0,.16,0,.58,.43,.54,"#d7bb75",1);
    for(let j=0;j<5;j++)for(let i=0;i<4;i++){
      const point=k=>{const a=(j+.32*Math.sin(k*1.6+j))*.93,u=.30+k*.25;
        return [.54*Math.sin(u)*Math.cos(a),.15+.43*Math.cos(u),.52*Math.sin(u)*Math.sin(a)];};
      limb(point(i),point(i+1),.027,.026,"#ac945d",4);
    }
  }else if(name==="coral-boulder"){
    const g=new T.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.57),p=g.attributes.position;
    for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+.08*Math.cos(17*x+2*Math.sin(7*z))*Math.cos(9*y+z);
      p.setXYZ(i,x*n*.52,(y+.22)*n*.56,z*n*.49);}
    g.computeVertexNormals();add(g,variant?"#d9a85a":"#d5bb7e");
  }else if(name==="coral-plate"){
    for(let i=0;i<3;i++){
      const r=.67*(1-i*.18);
      profile([[.03,0],[r*.85,.08],[r,.14],[r*.76,.19],[.05,.24]],10,.11*Math.sin(i),i*.14,.09*Math.cos(i),i%2?"#96c7ad":"#6baea7",.7);
    }
  }else if(name==="coral-table"){
    profile([[.15,0],[.10,.34],[.48,.39],[.61,.47],[.54,.53],[.26,.6],[0,.61]],14,0,0,0,variant?"#ce8094":"#ca9aa9",.22);
    for(let i=0;i<8;i++)lobe(.37*Math.cos(i*2.4),.55,.37*Math.sin(i*2.4),.047,.022,.047,"#eab9b7");
  }else if(name==="sponge-tubes"){
    for(let i=0;i<4;i++){
      const a=i*2.4+tilt,r=i===0?0:.24,h=(.74)*(.72+.29*Math.cos(i));
      profile([[.09,0],[.13,h*.7],[.15,h-.04],[.14,h],[.097,h+.014],[.078,h-.16],[0,h-.20]],6,r*Math.cos(a),0,r*Math.sin(a),i%2?"#9073c6":"#775da9");
    }
  }else if(name==="coral-branch"){
    limb([0,0,0],[0,.52,0],.12,.084,"#dc917c");
    for(let i=0;i<4;i++){const a=i*2.4+tilt,x=.34*Math.cos(a),z=.34*Math.sin(a);
      limb([0,.16,0],[x,.44,z],.087,.068,"#dc917c");limb([x,.44,z],[x,.64,z],.069,.061,"#e9ae91");
      lobe(x,.64,z,.08,.093,.08,"#e9ae91");}
  }else if(name==="soft-coral"){
    foliage(16,false);
  }
  const mesh=new T.Mesh(mergeVertices(mergeGeometries(parts)),matte);
  mesh.name=name+"-"+String.fromCharCode(97+variant);return mesh;
}
for(const [name,count] of Object.entries(families))for(let i=0;i<count;i++)scene.add(model(name,i));
const buoy=new T.Group();buoy.name="wake-buoy";
function fitting(name,geometry,color,y){
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color,roughness:.88}));
  mesh.name=name;mesh.position.y=y;buoy.add(mesh);
}
fitting("float",new T.LatheGeometry([[.32,-.33],[.46,-.26],[.5,-.13],[.5,.14],[.46,.28],[.35,.32],[0,.32]].map(([r,y])=>new T.Vector2(r,y)),16),"#efe2c4",.25);
for(const y of [.13,.43])fitting("terracotta-band",new T.CylinderGeometry(.503,.503,.065,16),"#c86a45",y);
fitting("waterline",new T.CylinderGeometry(.486,.475,.07,16),"#4d5a58",.04);
fitting("mast",new T.CylinderGeometry(.04,.079,.78,10),"#ae8c55",.96);
fitting("lantern-foot",new T.CylinderGeometry(.17,.12,.09,12),"#bc9758",1.37);
fitting("wake-buoy-lens",new T.CylinderGeometry(.105,.105,.18,12),"#ffc46b",1.5);
fitting("lantern-cap",new T.ConeGeometry(.17,.12,12),"#bc9758",1.64);
const sun=new T.Shape();sun.absarc(0,0,.175,0,Math.PI,false);sun.closePath();
fitting("wake-buoy-topmark",new T.ExtrudeGeometry(sun,{depth:.035,bevelEnabled:false}),"#efe2c4",1.72);
for(const a of [-.65,0,.65])fitting("sun-ray",new T.BoxGeometry(.032,.085,.03).rotateZ(a).translate(-.21*Math.sin(a),.21*Math.cos(a),0),"#efe2c4",1.72);
for(let i=0;i<3;i++)fitting("chain",new T.TorusGeometry(.055,.013,4,8).rotateY(i*Math.PI/2),"#4d5a58",-.10-i*.08);
const fittings=[];
for(const m of [...buoy.children]){
  if(m.name.startsWith("wake-buoy-"))continue;
  const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();m.updateMatrix();g.applyMatrix4(m.matrix);
  g.deleteAttribute("uv");const c=m.material.color,rgb=[];
  for(let i=0;i<g.attributes.position.count;i++)rgb.push(c.r,c.g,c.b);
  g.setAttribute("color",new T.Float32BufferAttribute(rgb,3));fittings.push(g);buoy.remove(m);
}
const float=new T.Mesh(mergeVertices(mergeGeometries(fittings)),matte);float.name="buoy-fittings";buoy.add(float);
scene.add(buoy);
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.()});}};
await writeFile(new URL("../public/models/sleep-world.glb",import.meta.url),new Uint8Array(await new GLTFExporter().parseAsync(scene,{binary:true})));

const animals=seaLife();
await writeFile(new URL("../public/models/sea-life.glb",import.meta.url),new Uint8Array(await new GLTFExporter().parseAsync(animals,{binary:true,animations:animals.animations})));
