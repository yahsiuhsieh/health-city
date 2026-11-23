import {SignText} from "../HarborBlock.tsx";
import {SliceContext} from "./SliceContext.tsx";
import {useEffect,useMemo} from "react";
import {SkylineDistrict} from "../SkylineDistrict.tsx";
import {SKYLINE_PLOTS} from "../skyline-layout.ts";
import type {HrvSkyline} from "../../core/skyline.ts";
import type {ReplayDay} from "../../core/representative-day.ts";
import type {Replay} from "../../core/replay.ts";
import {StreetLamp} from "../StreetLamp.tsx";
import {BackgroundBuildings} from "./BackgroundBuildings.tsx";
import {assembleDeco,frontage} from "./building-assembler.ts";
import {SliceGround,sliceFurniture} from "./SliceGround.tsx";
import {Contacts,Signals,SliceActors} from "./SliceActors.tsx";
import type {ShadowSpot} from "./SliceActors.tsx";
import {blockOffsetX,samplePlot} from "./slice-plan.ts";
import {groundHeight} from "./terrain.ts";

const sliceSites=[
  {...SKYLINE_PLOTS[5]!,x:-39.7,z:-20.6,yaw:Math.PI/2},
  {...SKYLINE_PLOTS[samplePlot.ordinal-1]!,x:samplePlot.x,z:samplePlot.z,yaw:Math.PI,envelope:[samplePlot.width,samplePlot.height,samplePlot.depth] as [number,number,number]},
];
const shophouseSite=sliceSites.slice(0,1);
const sliceFrontage=frontage.slice(0,3);
export default function CitySlice({night,hrv,day,replay,onReady,heartReady,inspect,onPlot}:{heartReady:boolean;onPlot:(id:number)=>void;inspect:(a:number,b:number)=>void;night:boolean;hrv:HrvSkyline;day:ReplayDay;replay:Replay;onReady:()=>void}){
  const occupied=hrv.status==="available" && hrv.buildingCount>=samplePlot.ordinal;
  const furniture=useMemo(()=>[...sliceFurniture(),...(occupied?assembleDeco(samplePlot.x,samplePlot.z,night):[])],[occupied,night]);
  const spots=useMemo<ShadowSpot[]>(()=>[
    ...sliceFrontage.map(b=>[b.x,groundHeight(b.x,b.z)+.19,b.z,b.w*1.4,b.d*1.35,.35] as ShadowSpot),
    ...furniture.filter(item=>item.module==="street-tree").map(item=>[item.at[0],item.at[1]+.085,item.at[2],6,5,.25] as ShadowSpot),
    ...(occupied?[[samplePlot.x,groundHeight(samplePlot.x,samplePlot.z)+.2,samplePlot.z,28,26,.35] as ShadowSpot]:[]),
  ],[furniture,occupied]);
  useEffect(()=>{onReady();},[onReady]);
  return <group name="Representative waterfront block">
    <SliceContext night={night} day={day} replay={replay} hrv={hrv} heartReady={heartReady} inspect={inspect} onPlot={onPlot}/>
    <group position-x={blockOffsetX}>
    <SliceGround/><BackgroundBuildings buildings={sliceFrontage} night={night} landscape={furniture}/><Contacts spots={spots}/>
    <SkylineDistrict sites={occupied?shophouseSite:sliceSites} night={night} hrv={hrv} focus={null} onPlot={onPlot} onSelect={()=>{}} onReady={onReady}/>
    {([[-66,"MARKET HALL",7.2],[-50.1,"HARBOUR EXCHANGE",9.4],[-36.8,"BAKERY",4.6]] as const).map(([x,text,width])=>
      <SignText key={text} text={text} position={[x,groundHeight(x,7)+4.11,7.55]} yaw={0} width={width} height={.60}/>)}
    <Signals replay={replay}/><SliceActors day={day} replay={replay} night={night}/>
    {[[-73,8,0],[-46,28,Math.PI],[-29,-20,Math.PI/2],[-10,2,-Math.PI/2],[-9,34,-Math.PI/2]].map(([x,z,yaw],i)=>
      <StreetLamp key={i} position={[x!,groundHeight(x!,z!)+.15,z!]} toward={yaw!} night={night} scale={1.85}/>)}
  </group></group>;
}
