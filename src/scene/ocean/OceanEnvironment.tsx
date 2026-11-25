import { Vector4 } from "three";
import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Replay } from "../../core/replay.ts";
import { revealDistanceAt, islandRevealAt } from "../sleep/timeline.ts";
import { islandSeabed,outerReefSeabed } from "../sleep/reef.ts";
import { destination } from "../sleep/island-preview.ts";
import { ROUTE_LENGTH } from "../sleep/route.ts";
import { asleepSeconds, type DaySleepVoyage } from "../sleep/session.ts";
import { ambientTime } from "./ambient-time.ts";
import { shelfMounds } from "./mounds.ts";

import { waterNoiseTexture, causticEdgeTexture } from "./pattern-textures.ts";
import type { SeabedOptions } from "./seabed.ts";
import { buildSeabed } from "./seabed.ts";

function makeOcean(island: ReturnType<typeof destination> | null, coastline?: SeabedOptions["coastline"]) {
  const bed = buildSeabed({coastline, features: coastline ? [] : shelfMounds()});
  const islandBed = island ? islandSeabed(island) : null;
  const outerBed=coastline ? null : outerReefSeabed();
  function floorAt(x:number,z:number) {
    let depth=bed.sampleAt(x,z,1)<0?0:bed.depthAt(x,z);
    if(outerBed?.contains(x,z))depth=Math.min(depth,outerBed.depthAt(x,z));
    if(islandBed?.contains(x,z))depth=Math.min(depth,islandBed.sampleAt(x,z,1)<0?0:islandBed.depthAt(x,z));
    return depth;
  }
  return { bed, islandBed, outerBed, floorAt, waterPass:{value:0}, uniforms: {
    outerMap:{value:outerBed?.texture??bed.texture},outerBounds:{value:outerBed?.bounds??new Vector4()},
    islandMap:{value:islandBed?.texture??bed.texture}, islandBounds:{value:islandBed?.bounds??new Vector4(0,0,0,0)},
    uRevealS:{value:-1}, uIslandReveal:{value:0},
    waterNoise: {value: waterNoiseTexture()}, causticEdge: {value: causticEdgeTexture()},
    bedMap: { value: bed.texture }, bedBounds: { value: bed.bounds },
    oceanTime: { value: 0 }, nightAmount: { value: 0 }, reveal: { value: 0 },
  } };
}
export type OceanEnvironment = ReturnType<typeof makeOcean>;
const Context = createContext<OceanEnvironment | null>(null);
export function useOcean() { return useContext(Context)!; }

export function OceanProvider({ replay, night, sleep, children, coastline }: {
  replay: Replay; night: boolean; sleep: DaySleepVoyage | null; children: ReactNode; coastline?:SeabedOptions["coastline"];
}) {
  const land = sleep && asleepSeconds(sleep.session)>0 ? destination(sleep.session) : null;
  const ocean = useMemo(() => makeOcean(land,coastline), [land,coastline]);
  useEffect(() => () => {
    ocean.bed.texture.dispose();
    ocean.islandBed?.texture.dispose();
    ocean.outerBed?.texture.dispose();
    ocean.uniforms.waterNoise.value.dispose();
    ocean.uniforms.causticEdge.value.dispose();
  }, [ocean]);
  useFrame(() => {
    const seconds = replay.read().seconds;
    ocean.uniforms.oceanTime.value = ambientTime(seconds);
    ocean.uniforms.nightAmount.value = Number(night);
    const t=sleep ? sleep.offset+seconds : -1;
    const distance=sleep && land ? revealDistanceAt(sleep.session,t) : -1;
    ocean.uniforms.uRevealS.value=distance;
    ocean.uniforms.uIslandReveal.value=sleep && land ? islandRevealAt(sleep.session,t) : 0;
    ocean.uniforms.reveal.value=Math.max(0,distance/ROUTE_LENGTH)+(60/ROUTE_LENGTH)*ocean.uniforms.uIslandReveal.value;
  }, -1);
  return <Context.Provider value={ocean}>{children}</Context.Provider>;
}
