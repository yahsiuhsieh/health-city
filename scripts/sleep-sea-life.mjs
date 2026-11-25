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
function fin(stations,color,underside=color){
  const p=[],idx=[];
  for(const [i,[z,front,back,y,thick]] of stations.entries()){
    p.push(front,y,z,front*.55+back*.45,y+thick,z,back,y,z,front*.55+back*.45,y-thick*.35,z);
    if(i)for(let j=0;j<4;j++){
      const a=4*i+j,b=4*i+(j+1)%4;idx.push(a-4,b-4,a,b-4,b,a);
    }
  }
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
  const result=piece(g,color);
  if(underside!==color){
    const colors=result.getAttribute("color"),lower=new T.Color(underside);
    for(let i=0;i<idx.length;i+=6){
      if(idx[i]%4>=2)for(let j=i;j<i+6;j++)colors.setXYZ(j,lower.r,lower.g,lower.b);
    }
  }
  return result;
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
  const ink="#172a32",ivory="#e2e6dc";
  const rayStations=[[-1.2,0,.06,.06],[-.65,0,.42,.16],[.23,0,.58,.23],[.81,.01,.46,.20],[1.01,.01,.26,.10]];
  const rayBody=[hull(rayStations,ink,ivory)];
  for(const side of [-1,1]){
    rayBody.push(oval(.69,.105,side*.39,.09,.064,.055,"#131e23"),
      fin([[side*.28,1.04,.63,.04,.08],[side*.38,1.38,.77,.11,.07],[side*.43,1.43,1.17,.20,.02]],ink,ivory));
    // The five gill openings follow the ventral surface on each side of the head.
    for(let j=0;j<5;j++){
      const x=.18-j*.135;
      const u=(x+.65)/.88,width=.42+.16*u,height=.16+.07*u;
      const slit=[.22,.44,.68].map((fraction,i)=>{
        const at=x-.055*Math.sin(i*Math.PI/2);
        return [side*width*fraction,at+.014,at-.014,-height*Math.sqrt(1-fraction*fraction)-.008,.001];
      });
      rayBody.push(fin(slit,"#515d60"));
    }
  }
  node(ray,"ray-body",rayBody);
  for(const s of [-1,1]){
    const wing=fin([[0,.76,-.96,0,.16],[s*.5,.66,-1.05,.01,.13],[s*1.14,.36,-.88,.02,.085],
      [s*1.68,-.04,-.67,.08,.044],[s*2.14,-.39,-.46,.11,.008]],ink,ivory);
    const shoulder=fin([[s*.32,.72,.57,.218,.012],[s*.49,.57,.39,.181,.009],[s*.69,.49,.34,.153,.006],[s*.97,.54,.47,.106,.005]],"#e2e3cc");
    node(ray,"ray-wing-"+(s<0?"left":"right"),[wing,shoulder]);
  }
  node(ray,"ray-tail",[hull([[-1.98,-.02,.008,.009],[-1.54,-.035,.041,.043],[-.91,0,.10,.07]],ink,ivory,8)]);
  for(const shark of [false,true]){
    const name=shark?"shark":"whale",body=new T.Group();body.name=name;root.add(body);
    const tone=shark?"#344d57":"#26313a";
    const stations=shark?
      [[-3.85,-.06,.11,.17],[-3.14,-.055,.25,.30],[-2.2,-.02,.53,.54],[-1.15,.01,.76,.70],
       [.12,.04,1,.73],[1.31,.025,1.05,.69],[2.19,.0,.99,.49],[2.81,-.04,.84,.32],[3.08,-.05,.69,.15],[3.12,-.07,.03,.04]]:
      [[-3.85,-.04,.11,.15],[-3.24,-.04,.24,.32],[-2.3,0,.49,.58],[-1.4,.02,.78,.80],
       [-.55,.055,.96,.94],[.52,.05,1,.97],[1.58,.035,.96,.85],[2.37,.06,.79,.66],[2.98,.04,.49,.42],[3.25,.04,.08,.13]];
    const bodyParts=[hull(stations,tone,shark?"#dedfce":"#a8b1af",20)];
    for(const side of [-1,1]){
      bodyParts.push(oval(shark?2.62:1.99,.05,side*(shark?.87:.85),.069,.063,.046,"#161f22"),
        fin([[side*.73,1.25,.28,-.23,.15],[side*1.28,.87,-.02,-.34,.14],
          [side*(shark?1.74:2.28),.27,-.52,-.54,.09],[side*(shark?2:2.95),-.36,-.82,-.67,.04],
          [side*(shark?2.12:3.12),-.71,-.80,-.65,.009]],shark?tone:"#e3e5d9"));
    }
    const dorsal=fin([[0,.32,-.78,0,.11],[.31,-.04,-.60,0,.08],[shark?1.38:.48,-.43,-.53,0,.013]],tone);
    dorsal.rotateX(-Math.PI/2);dorsal.translate(-1.13,.60,0);
    if(shark){
      node(body,"shark-dorsal",[dorsal]);
      // Follow the loft between stations so spots meet the curved skin.
      for(let i=1;i<stations.length-1;i++)for(const t of [.15,.62]){
        const row=stations[i].map((v,k)=>v+(stations[i+1][k]-v)*t);
        const [x,y,w,h]=row;
        for(let j=0;j<9;j++){
          const a=.17+2.8*(j+.18*Math.sin(i+j))/8;
          const spot=new T.CircleGeometry(.075+.009*Math.sin(i*3+j),5);
          spot.rotateX(-a);spot.translate(x,y+(h+.012)*Math.sin(a),(w+.012)*Math.cos(a));
          bodyParts.push(piece(spot,"#ece7cd"));
        }
        if(t===.15 && i%2===1)for(const side of [-1,1]){
          const stripe=fin([[.05,x+.035,x-.035,y+h+.013,.004],
            [side*w*.52,x+.08,x+.015,y+h*.87+.016,.004],[side*w*.87,x+.09,x+.064,y+h*.50+.014,.002]],"#a3aca3");
          bodyParts.push(stripe);
        }
      }
      bodyParts.push(piece(new T.BoxGeometry(.035,.028,1.28).translate(3.085,-.067,0),"#253438"));
    }else{
      bodyParts.push(dorsal);
      for(const sign of [-1,1])for(let j=0;j<5;j++){
        const x=2.12+.208*j;
        bodyParts.push(oval(x,.26,sign*(.78-.098*j),.105,.09,.075,"#626b6d"));
      }
      for(const side of [-1,1])for(let j=1;j<=3;j++){
        const angle=-Math.PI/2+side*j*.24;
        const pleat=stations.slice(4).map(([x,y,w,h])=>new T.Vector3(x,y+(h+.014)*Math.sin(angle),(w+.014)*Math.cos(angle)));
        bodyParts.push(piece(new T.TubeGeometry(new T.CatmullRomCurve3(pleat),6,.019,3,false),"#d1d6ca"));
      }
    }
    node(body,name+"-body",bodyParts);
    const fins=[-1,1].map(s=>fin([[0,.11,-.44,0,.12],[s*.46,-.06,-.71,.04,.095],
      [s*1.12,-.38,-.86,.07,.055],[s*(shark?(s<0?2.04:1.04):1.57),-.82,-.87,.12,.008]],tone,shark?tone:ivory));
    if(shark)for(const g of fins)g.rotateX(Math.PI/2);
    node(body,shark?"shark-tail":"whale-flukes",fins,[-3.8,-.06,0]);
  }
  for(const [name,span,brown] of [["booby",1.4,true],["tern",.8,false]]){
    const feather=brown?"#534239":"#b1bec1",head=brown?"#775d49":"#313d42";
    const parts=[hull([[-.32,0,.01,.02],[-.15,0,.065,.08],[.05,0,.085,.095],[.17,.05,.063,.065],[.24,.055,.017,.025]],feather,"#fff1d6",10),
      oval(.16,.08,0,.07,.065,.058,head),
      hull([[.19,.064,.036,.034],[.34,.053,.002,.004]],brown?"#c5bd95":"#cf7950","#c7ae79",6)];
    for(const side of [-1,1]){
      parts.push(fin([[0,-.10,brown?-.41:-.24,.01,.017],[side*.065,-.21,brown?-.39:-.42,0,.012],[side*.095,-.34,brown?-.35:-.49,0,.003]],feather));
      parts.push(fin([[side*.05,.12,-.14,.025,.03],[side*span*.25,.08,-.15,.12,.018],[side*span*.38,-.016,-.13,.135,.012],[side*span*.5,-.16,-.19,.12,.002]],feather));
    }
    node(root,name,parts.map(g=>brown?g:g.scale(.72,.72,1)));
  }
  const fishBody=hull([[-.19,0,.010,.016],[-.10,0,.025,.036],[-.015,.006,.041,.051],[.105,.005,.037,.041],[.19,.002,.012,.017]],"#285772","#dde7df",8);
  const fishParts=[fishBody];
  for(const s of [-1,1]){
    fishParts.push(fin([[0,.025,-.035,0,.008],[s*(s<0?.096:.061),-.055,-.078,0,.003]],"#728e9d")
      .rotateX(-Math.PI/2).translate(-.19,0,0),
      fin([[s*.027,.077,-.04,0,.008],[s*.13,.032,-.14,.015,.005],[s*.23,-.09,-.15,.033,.002]],"#b6c9d6"),
      fin([[s*.012,-.079,-.12,-.022,.005],[s*.093,-.129,-.163,-.020,.002]],"#8fabbb"),
      piece(new T.OctahedronGeometry(.011,0).scale(1,.8,.48).translate(.127,.010,s*.034),"#182c39"));
  }
  node(root,"flying-fish",fishParts);
  const dolphin=[hull([[-1.03,-.04,.045,.056],[-.69,0,.095,.12],[-.28,.03,.19,.22],[.33,.04,.226,.25],[.65,.075,.18,.195],[.745,.075,.15,.16],[.81,.015,.080,.070],[1.10,.004,.035,.033]],"#638591","#d1dfd9",12),
    fin([[0,.23,-.2,0,.05],[.20,.025,-.14,0,.029],[.34,-.08,-.15,0,.018],[.40,-.21,-.23,0,.005]],"#5b7582").rotateX(-Math.PI/2).translate(-.13,.19,0)];
  for(const s of [-1,1])dolphin.push(fin([[0,.1,-.19,0,.035],[s*.27,-.09,-.27,0,.018],[s*.36,-.3,-.37,.018,.003]],"#69848c").translate(-1.03,-.04,0),
    fin([[s*.13,.43,.17,-.06,.04],[s*.42,.15,.06,-.16,.01]],"#647f88"),oval(.62,.075,s*.175,.026,.022,.012,"#25373e"));
  node(root,"dolphin",dolphin);
  // Bake every part in animal-local metres, including appendages on offset nodes.
  // The glTF custom attribute _ALONG loads as _along in Three.js.
  for(const [name,axis,size] of [["whale","x",16],["shark","x",12],["ray","z",8],["dolphin","x",4],
    ["booby","z",2.8],["tern","z",1.8],["flying-fish","x",.9]]){
    const animal=root.getObjectByName(name);
    animal.updateWorldMatrix(true,true);
    const bounds=new T.Box3().setFromObject(animal),extent=bounds.getSize(new T.Vector3());
    const k=size/extent[axis],spanScale=name==="flying-fish"?1/extent.z:k;
    animal.traverse(part=>{
      if(!part.isMesh)return;
      const g=part.geometry;g.applyMatrix4(part.matrixWorld);g.scale(k,k,spanScale);
      const pos=g.getAttribute("position"),along=[];
      for(let i=0;i<pos.count;i++)along.push((bounds.max.x-pos.getX(i)/k)/extent.x);
      g.setAttribute("along",new T.Float32BufferAttribute(along,1));
      part.position.set(0,0,0);part.scale.setScalar(1);part.rotation.set(0,0,0);
      g.computeBoundingBox();g.computeBoundingSphere();
    });
  }
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
