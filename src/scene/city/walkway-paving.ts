import {towerSites} from "./city-plan.data.ts";
import {footwayClipper} from "./pavement.ts";
import type {Point} from "./street-graph.ts";
import {openSpaceEntries,towerGardens} from "./tower-gardens.ts";
import {parkPaving,ribbon} from "./walkway-shape.ts";

// Allocate each patch of pavement to one surface. Later paths meet the boundary of earlier ones.
export function pavementLayer(obstacles:{polygon:Point[]}[]){
  const cut=footwayClipper(obstacles),patches:Point[][]=[];
  function pave(quads:Point[][]){
    for(const quad of quads){
      for(const polygon of cut(quad)){
        cut.reserve(polygon);
        patches.push(polygon);
      }
    }
  }
  return {pave,patches};
}

function extendToSidewalks(line:Point[]){
  function tip(a:Point,b:Point):Point{
    const dx=a[0]-b[0],dz=a[1]-b[1],len=Math.hypot(dx,dz);
    return [a[0]+2*dx/len,a[1]+2*dz/len];
  }
  return [tip(line[0]!,line[1]!),...line,tip(line.at(-1)!,line.at(-2)!)];
}

export function gardenPavement(count:number|null,obstacles:{polygon:Point[]}[]){
  const {items,paths,walks}=towerGardens(count),entries=openSpaceEntries(count);
  const layer=pavementLayer([...obstacles,...entries.filter(e=>e.outline.length).map(e=>({polygon:e.outline}))]);
  const reserved=towerSites.slice(count??0).map(({x,z,width,depth})=>{
    const w=width/2,d=depth/2;
    return {polygon:[[x-w,z-d],[x+w,z-d],[x+w,z+d],[x-w,z+d]] as Point[]};
  });
  const outsidePlots=footwayClipper(reserved);
  for(const walk of walks)layer.pave(ribbon(extendToSidewalks(walk),1).flatMap(outsidePlots));
  for(const {path,halfWidth,nearest,normal,receivingWidth,site,sideSeat} of entries){
    const width=(p:Point)=>{
      const along=(p[0]-nearest[0])*normal[0]+(p[1]-nearest[1])*normal[1]-receivingWidth;
      const r=.70,u=Math.min(r,Math.max(0,r-along));
      return halfWidth+r-Math.sqrt(r*r-u*u);
    };
    layer.pave(site.interimForm==="park"?parkPaving(path,width,sideSeat):ribbon(path,width));
  }
  for(const path of paths)layer.pave(ribbon(path,.93));
  return {items,patches:layer.patches,terraces:entries.filter(entry=>entry.outline.length)};
}
