import {Plane,Vector3} from "three";
import {CityGround} from "./CityGround.tsx";
import {HarborBlock} from "../HarborBlock.tsx";
import {HeartRidge} from "../HeartRidge.tsx";
import {SkylineDistrict} from "../SkylineDistrict.tsx";
import {SKYLINE_PLOTS} from "../skyline-layout.ts";
import {blockOffsetX,samplePlot,sliceOutline} from "./slice-plan.ts";
import type {HrvSkyline} from "../../core/skyline.ts";
import type {ReplayDay} from "../../core/representative-day.ts";
import type {Replay} from "../../core/replay.ts";

// Retain the earlier surroundings so the review can compare the actual daily counts.
// Only the representative block replaces the old ground and buildings.
const xs = sliceOutline.map(([x]) => x + blockOffsetX);
const zs = sliceOutline.map(([,z]) => z);
const west = Math.min(...xs), east = Math.max(...xs), south = Math.min(...zs), north = Math.max(...zs);
const clippingPlanes = [
  new Plane(new Vector3(-1,0,0), west), new Plane(new Vector3(1,0,0), -east),
  new Plane(new Vector3(0,0,1), -north), new Plane(new Vector3(0,0,-1), south),
];
// The slice occupies plots 0 and 5. Move plot 0 to the park's original site.
const parkSite=SKYLINE_PLOTS[samplePlot.ordinal-1]!;
const plots=SKYLINE_PLOTS.filter(p=>p.id!==5 && p.id!==parkSite.id).map(p=>
  p.id===0?{...p,x:parkSite.x,z:parkSite.z,yaw:parkSite.yaw}:p);
export function SliceContext({hrv,night,day,replay,heartReady,inspect,onPlot}:{hrv:HrvSkyline;night:boolean;day:ReplayDay;replay:Replay;heartReady:boolean;onPlot:(id:number)=>void;inspect:(a:number,b:number)=>void}){
  return <><CityGround occupiedCount={hrv.status==="available"?hrv.buildingCount:null} night={night} cutout={clippingPlanes}/><HarborBlock replay={replay} night={night} cutout={clippingPlanes}/>
    <SkylineDistrict night={night} hrv={hrv} focus={null} onReady={noop} onSelect={noop} sites={plots} onPlot={onPlot}/>
    <HeartRidge day={day} replay={replay} available={heartReady} inspect={inspect}/>
  </>;
}
function noop(){}
