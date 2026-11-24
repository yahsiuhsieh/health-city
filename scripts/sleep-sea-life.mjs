import { dolphinMotion, dolphinPeriods } from "../src/scene/sleep/wildlife.ts";
import * as T from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const matte=new T.MeshStandardMaterial({vertexColors:true,roughness:.89,side:T.DoubleSide});
function piece(geometry,color){
  const g=geometry.index?geometry.toNonIndexed():geometry;
  g.deleteAttribute("uv");
  const c=new T.Color(color),a=[],n=g.attributes.normal;
  for(let i=0;i<n.count;i++){
    const v=.93+.07*n.getY(i);a.push(c.r*v,c.g*v,c.b*v);
  }
  g.setAttribute("color",new T.Float32BufferAttribute(a,3));return g;
}
function node(parent,name,parts,at=[0,0,0]){
  const m=new T.Mesh(mergeVertices(mergeGeometries(parts)),matte);
  m.name=name;m.position.set(...at);parent.add(m);return m;
}
function oval(x,y,z,rx,ry,rz,color){
  return piece(new T.SphereGeometry(1,10,6).scale(rx,ry,rz).translate(x,y,z),color);
}
// Each station specifies the span, leading edge, trailing edge, height, and camber of a fin.
function fin(stations,color){
  const p=[],idx=[];
  for(const [i,[z,front,back,y,thick]] of stations.entries()){
    p.push(front,y,z,front*.55+back*.45,y+thick,z,back,y,z,front*.55+back*.45,y-thick*.35,z);
    if(i)for(let j=0;j<4;j++){
      const a=4*i+j,b=4*i+(j+1)%4;idx.push(a-4,b-4,a,b-4,b,a);
    }
  }
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
  return piece(g,color);
}
function hull(stations,top,belly,sides=14){
  const p=[],color=[],idx=[];const dark=new T.Color(top),light=new T.Color(belly);
  for(const [i,[x,y,w,h]] of stations.entries())for(let j=0;j<sides;j++){
    const a=j*2*Math.PI/sides,s=Math.sin(a);
    p.push(x,y+s*h,w*Math.cos(a));const c=dark.clone().lerp(light,T.MathUtils.smoothstep(-s,.12,.89));color.push(c.r,c.g,c.b);
    if(i){const k=i*sides+j,next=i*sides+(j+1)%sides;idx.push(k-sides,next-sides,k,next-sides,next,k);}
  }
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(p,3));g.setAttribute("color",new T.Float32BufferAttribute(color,3));g.setIndex(idx);g.computeVertexNormals();return g.toNonIndexed();
}
export function seaLife(){
  const root=new T.Group();
  const ray=new T.Group();ray.name="ray";root.add(ray);
  node(ray,"ray-body",[hull([[-.9,0,.02,.04],[-.53,0,.36,.1],[.31,0,.48,.16],[.76,0,.26,.13],[.88,0,.05,.07]],"#526e74","#cfdbcb"),
    ...[-1,1].flatMap(s=>[oval(.53,.10,s*.34,.055,.043,.05,"#243e43"),
      fin([[s*.20,1.04,.62,.045,.045],[s*.31,1.02,.53,.06,.05],[s*.35,.78,.50,.025,.02]],"#73868a")])]);

  for(const side of [-1,1])node(ray,"ray-wing-"+(side<0?"left":"right"),[fin([[0,.58,-.67,0,.09],[side*.48,.28,-.73,-.03,.07],[side*1.38,-.08,-.70,.01,.045],[side*2.04,-.45,-.5,.09,.01]],"#57767b")],[0,0,side*.21]);
  node(ray,"ray-tail",[hull([[0,0,.09,.07],[-.65,-.06,.045,.04],[-1.4,.03,.009,.008]],"#566a70","#8faaa8",8)],[-.75,0,0]);
  for(const shark of [false,true]){
    const name=shark?"shark":"whale",body=new T.Group();body.name=name;root.add(body);
    const tone=shark?"#506e77":"#425d70";
    const bodyParts=[hull([[-3.9,-.08,.13,.15],[-2.95,-.06,.33,.42],[-1.55,.02,.78,.81],[.45,.03,1.02,.95],[1.8,.03,.92,.8],[2.75,.03,.55,.53],[3.23,.05,.1,.19]],tone,"#becdca"),
      ...[-1,1].flatMap(s=>[oval(1.97,.09,s*.86,.072,.07,.048,"#243a40"),fin([[s*.66,1.12,-.2,-.21,.13],[s*(shark?1.24:1.75),.57,-.38,-.43,.08],[s*(shark?1.92:2.58),-.38,-.66,-.62,.035],[s*(shark?2.03:2.91),-.66,-.73,-.57,.012]],shark?tone:"#a5b9ba")])];
    const dorsal=fin([[0,.32,-.71,0,.12],[.42,-.03,-.58,0,.06],[shark?1.15:.61,-.48,-.54,0,.01]],tone);
    dorsal.rotateX(-Math.PI/2);dorsal.translate(-1.14,.67,0);
    if(shark){
      node(body,"shark-dorsal",[dorsal]);
      // Pale spot rows follow the back and flanks.
      for(const [x,y,w,h] of [[-2.95,-.06,.33,.42],[-1.55,.02,.78,.81],[.45,.03,1.02,.95],[1.8,.03,.92,.8],[2.75,.03,.55,.53]]){
        for(let j=0;j<13;j++){
          const a=.18+(Math.PI-.36)*j/12;
          const spot=new T.CircleGeometry(.057+.012*Math.sin(j+x),5);
          spot.rotateX(-a);spot.translate(x+.14*Math.sin(j*2),y+h*Math.sin(a)*1.015,w*Math.cos(a)*1.015);
          bodyParts.push(piece(spot,"#e1dec4"));
        }
      }
    }else {
      bodyParts.push(dorsal);
      for(const sign of [-1,1])for(let j=0;j<5;j++){
        const x=2.0+.22*j;
        bodyParts.push(oval(x,.23,sign*(.82-j*.125),.066,.055,.055,"#809398"));
      }
    }
    node(body,name+"-body",bodyParts);
    const fins=[-1,1].map(s=>fin([[0,.1,-.6,0,.1],[s*.52,-.07,-.67,0,.08],[s*1.1,-.4,-.75,.03,.04],[s*1.48,-.72,-.75,.12,.01]],tone));
    if(shark)for(const g of fins)g.rotateX(Math.PI/2);
    node(body,shark?"shark-tail":"whale-flukes",fins,[-3.8,-.08,0]);body.scale.setScalar((shark?9:13)/7.78);
  }
  for(const [name,span,brown] of [["booby",1.4,true],["tern",.8,false]]){
    const feather=brown?"#534239":"#b1bec1",head=brown?"#775d49":"#313d42";
    const parts=[hull([[-.32,0,.01,.02],[-.15,0,.065,.08],[.05,0,.085,.095],[.17,.05,.063,.065],[.24,.055,.017,.025]],feather,"#fff1d6",10),
      oval(.16,.08,0,.07,.065,.058,head),
      hull([[.19,.064,.036,.034],[.34,.053,.002,.004]],brown?"#c5bd95":"#cf7950","#c7ae79",6)];
    for(const side of [-1,1]){
      parts.push(fin([[0,-.10,-.29,.01,.017],[side*.09,-.21,-.39,0,.012],[side*.095,-.36,-.41,0,.003]],feather));
      parts.push(fin([[side*.05,.12,-.14,.025,.03],[side*span*.25,.08,-.15,.12,.018],[side*span*.38,-.016,-.13,.135,.012],[side*span*.5,-.16,-.19,.12,.002]],feather));
    }
    node(root,name,parts.map(g=>brown?g:g.scale(.72,.72,1)));
  }
  const fishBody=hull([[-.19,0,.008,.015],[-.07,0,.034,.046],[.11,0,.039,.04],[.19,0,.01,.016]],"#528e9b","#e0e7cf",8);
  const fishTail=fin([[0,.035,-.045,0,.009],[.064,-.044,-.068,0,.004]],"#87aeb6").rotateX(Math.PI/2).translate(-.19,0,0);
  node(root,"flying-fish",[fishBody,fishTail,...[-1,1].map(s=>fin([[s*.02,.09,-.02,0,.008],[s*.12,.02,-.12,.015,.004],[s*.23,-.105,-.14,.033,.002]],"#b6d8da"))]);
  node(root,"school-fish",[hull([[-.16,0,.003,.012],[-.04,0,.031,.047],[.10,0,.025,.033],[.16,0,.003,.01]],"#76999e","#dce3d7",6),
    fin([[0,.019,-.032,0,.01],[.05,-.024,-.037,0,.002]],"#9fbabf").rotateX(Math.PI/2).translate(-.135,0,0)]);
  const dolphin=[hull([[-1.03,-.04,.045,.056],[-.69,0,.095,.12],[-.28,.03,.19,.22],[.33,.04,.226,.25],[.65,.06,.185,.18],[.82,.045,.09,.08],[1,.035,.04,.04]],"#638591","#d1dfd9",12),
    fin([[0,.23,-.2,0,.05],[.21,.01,-.2,0,.023],[.34,-.15,-.20,0,.007]],"#5b7582").rotateX(-Math.PI/2).translate(-.13,.19,0)];
  for(const s of [-1,1])dolphin.push(fin([[0,.1,-.19,0,.035],[s*.27,-.09,-.27,0,.018],[s*.36,-.3,-.37,.018,.003]],"#69848c").translate(-1.03,-.04,0),
    fin([[s*.13,.43,.17,-.06,.04],[s*.42,.15,.06,-.16,.01]],"#647f88"),oval(.62,.075,s*.175,.026,.022,.012,"#25373e"));
  node(root,"dolphin",dolphin);
  for(const [clip,period] of Object.entries(dolphinPeriods)){
    const times=[],positions=[],rotations=[];
    for(let i=0;i<=48;i++){
      const age=period*i/48,{height,pitch}=dolphinMotion(clip,age);
      times.push(age);positions.push(0,height,0);rotations.push(0,0,Math.sin(pitch/2),Math.cos(pitch/2));
    }
    root.animations.push(new T.AnimationClip(clip,period,[new T.VectorKeyframeTrack("dolphin.position",times,positions),
      new T.QuaternionKeyframeTrack("dolphin.quaternion",times,rotations)]));
  }
  return root;
}
