import { seededOrder } from "../seeded-order.ts";
import { edgeCenterline, sections, type StreetGraph } from "./street-graph.ts";

export const formQuotas = {shophouse:8, walkup:5, hall:3, bank:2, park:7, plaza:5} as const;
export type InterimForm = keyof typeof formQuotas;
export const isOpenSpace = (form:InterimForm) => form==="park" || form==="plaza";
export const plotState = (id:number,count:number|null) => count===null?"wireframe":id<count?"tower":"interim";
type Site = {id:number;x:number;z:number;width:number;depth:number;yaw:number};

export function assignInterimForms(sites:Site[],graph:StreetGraph,seed:number) {
  const segments=graph.edges.filter(e=>e.cls!=="alley").flatMap(edge=>{
    const points=edgeCenterline(graph,edge);
    return points.slice(1).map((b,i)=>({edge,a:points[i]!,b}));
  });
  const metadata=sites.map(s=>{
    const faces=new Map<number,{gap:number;street:string}>();
    for(const {a,b,edge} of segments){
      const dx=b[0]-a[0],dz=b[1]-a[1];
      const t=((s.x-a[0])*dx+(s.z-a[1])*dz)/(dx*dx+dz*dz);
      if(t<0 || t>1)continue;
      const ox=a[0]+dx*t-s.x,oz=a[1]+dz*t-s.z;
      const face=(Math.round(Math.atan2(ox,oz)/(Math.PI/2))+4)%4;
      const gap=Math.hypot(ox,oz)-sections[edge.cls].width/2-(face%2?s.width:s.depth)/2;
      if(gap<=4 && gap<(faces.get(face)?.gap??Infinity))faces.set(face,{gap,street:edge.name!});
    }
    const front=(Math.round(s.yaw/(Math.PI/2))+4)%4;
    const cornerSide=faces.has(front) ? [1,-1].find(turn=>faces.has((front+turn+4)%4))??0 : 0;
    const adjacent=sites.filter(other=>{
      if(other===s)return false;
      const dx=other.x-s.x,dz=other.z-s.z;
      const gx=Math.abs(dx)-(s.width+other.width)/2,gz=Math.abs(dz)-(s.depth+other.depth)/2;
      if((Math.abs(gx)<.01&&gz<0)||(Math.abs(gz)<.01&&gx<0))return true;
      if(gx>=0 && gz>=0)return false;
      return segments.some(({edge,a,b})=>{
        if(edge.cls!=="local" || Math.max(gx,gz)>sections.local.width+8)return false;
        const ex=b[0]-a[0],ez=b[1]-a[1],det=dx*ez-dz*ex;
        if(Math.abs(det)<.001)return false;
        const ax=a[0]-s.x,az=a[1]-s.z,t=(ax*ez-az*ex)/det,u=(ax*dz-az*dx)/det;
        return t>0&&t<1&&u>=0&&u<=1;
      });
    }).map(v=>v.id);
    return {cornerSide,adjacent,faces};
  });
  // Reserve the two most continuous street frontages of each enclosed block.
  // Shoreline parcels outside the enclosed blocks provide additional open space.
  const blockKey=(s:Site)=>s.z < -47 ? (s.x < -157 ? "orchard-west" : s.x < -97 ? "orchard-east" : "quayside")
    : s.z < 18 ? (s.x < -97 ? "market-west" : "market-east") : s.z < 65 ? "valley" : "shore";
  const protectedFronts:Record<string,string[]>={
    "market-west":["Market Avenue","Ridge Road"], "market-east":["Central Avenue","Harbor Avenue"],
    "orchard-west":["Ridge Road","Garden Street"], "orchard-east":["Central Avenue","Garden Street"],
    quayside:["Central Avenue","Harbor Avenue"], valley:["Valley Lane","Ridge Road"], shore:[],
  };
  const canOpen=sites.map((s,i)=>![...metadata[i]!.faces.values()].some(f=>protectedFronts[blockKey(s)]!.includes(f.street)));
  const order=seededOrder(sites.map(s=>s.id),seed);
  const forms:InterimForm[]=[];
  const kinds=Object.keys(formQuotas) as InterimForm[];
  const quota={...formQuotas} as Record<InterimForm,number>;
  const total=Object.values(formQuotas).reduce((a,b)=>a+b,0);
  const share=(f:InterimForm)=>sites.length*formQuotas[f]/total;
  for(const f of kinds)quota[f]=Math.floor(share(f));
  const remainder=sites.length-Object.values(quota).reduce((a,b)=>a+b,0);
  for(const f of [...kinds].sort((a,b)=>(share(b)%1)-(share(a)%1)).slice(0,remainder))quota[f]++;
  const substitute=Math.max(0,quota.walkup-metadata.filter(m=>m.cornerSide!==0).length);
  quota.walkup-=substitute;quota.shophouse+=substitute;
  function allocate(n:number):boolean {
    if(n===order.length)return true;
    const id=order[n]!,m=metadata[id]!;
    for(const form of seededOrder(kinds,seed+id*7919)){
      if(!quota[form] || (form==="walkup"&&!m.cornerSide) || (isOpenSpace(form)&&!canOpen[id]))continue;
      if(m.adjacent.some(j=>forms[j]===form))continue;
      forms[id]=form;quota[form]--;
      const first=forms.slice(0,5).filter(Boolean);
      if((first.length<5 || (first.some(isOpenSpace)&&new Set(first.filter(f=>!isOpenSpace(f))).size>=2)) &&
         order.slice(n+1).filter(j=>canOpen[j]).length>=quota.park+quota.plaza &&
         order.slice(n+1).filter(j=>metadata[j]!.cornerSide).length>=quota.walkup && allocate(n+1))return true;
      delete forms[id];quota[form]++;
    }
    return false;
  }
  if(!allocate(0))throw Error("Cannot assign interim forms to these plots.");
  return metadata.map((m,id)=>({interimForm:forms[id]!,cornerSide:m.cornerSide,adjacent:m.adjacent}));
}
