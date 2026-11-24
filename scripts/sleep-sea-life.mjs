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
    ...[-1,1].map(s=>oval(.46,.12,s*.17,.055,.043,.05,"#243e43"))]);
  for(const side of [-1,1])node(ray,"ray-wing-"+(side<0?"left":"right"),[fin([[0,.58,-.67,0,.09],[side*.48,.28,-.73,-.03,.07],[side*1.05,-.08,-.70,.01,.045],[side*1.45,-.45,-.5,.09,.01]],"#57767b")],[0,0,side*.21]);
  node(ray,"ray-tail",[hull([[0,0,.09,.07],[-.65,-.06,.045,.04],[-1.4,.03,.009,.008]],"#566a70","#8faaa8",8)],[-.75,0,0]);
  for(const shark of [false,true]){
    const name=shark?"shark":"whale",body=new T.Group();body.name=name;root.add(body);
    const tone=shark?"#778e92":"#506775",scale=shark?.62:1;
    const bodyParts=[hull([[-3.9,-.08,.13,.15],[-2.95,-.06,.33,.42],[-1.55,.02,.78,.81],[.45,.03,1.02,.95],[1.8,.03,.92,.8],[2.75,.03,.55,.53],[3.23,.05,.1,.19]],tone,"#becdca"),
      ...[-1,1].flatMap(s=>[oval(1.97,.09,s*.86,.072,.07,.048,"#243a40"),fin([[s*.66,1.12,-.2,-.21,.13],[s*1.24,.57,-.38,-.43,.08],[s*1.92,-.38,-.52,-.65,.015]],tone)])];
    const dorsal=fin([[0,.32,-.71,0,.12],[.42,-.03,-.58,0,.06],[shark?1.15:.61,-.48,-.54,0,.01]],tone);
    dorsal.rotateX(-Math.PI/2);dorsal.translate(-1.14,.67,0);
    if(shark)node(body,"shark-dorsal",[dorsal]);else bodyParts.push(dorsal);
    node(body,name+"-body",bodyParts);
    const fins=[-1,1].map(s=>fin([[0,.1,-.6,0,.1],[s*.52,-.07,-.67,0,.08],[s*1.1,-.4,-.75,.03,.04],[s*1.48,-.72,-.75,.12,.01]],tone));
    if(shark)for(const g of fins)g.rotateX(Math.PI/2);
    node(body,shark?"shark-tail":"whale-flukes",fins,[-3.8,-.08,0]);body.scale.setScalar(scale);
  }
  for(const [i,name] of ["fish-a","fish-b"].entries())node(root,name,[hull([[-.28,0,.01,.018],[-.08,0,.068,.09],[.13,0,.056,.065],[.23,0,.008,.018]],i?"#53899c":"#e2b758","#cbd3aa",6),fin([[0,.02,-.11,0,.035],[.1,-.05,-.14,0,.01]],"#b6ad76").rotateX(Math.PI/2).translate(-.21,0,0)]);
  return root;
}
