import { Vector4 } from "three";
import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import type { Replay } from "../../core/replay.ts";
import { revealDistanceAt, islandRevealAt } from "../sleep/timeline.ts";
import { ROUTE_LENGTH } from "../sleep/route.ts";
import { SYNTHETIC_SESSION } from "../sleep/session.ts";
import { waterMap, sleepFeatures } from "../sleep/water-map.ts";
import { ambientTime } from "./ambient-time.ts";
import { shelfMounds } from "./mounds.ts";

import { waterNoiseTexture, causticEdgeTexture } from "./pattern-textures.ts";
import type { SeabedOptions } from "./seabed.ts";
import { buildSeabed } from "./seabed.ts";

function makeOcean(hasIsland: boolean, coastline?: SeabedOptions["coastline"]) {
  const zones = hasIsland ? waterMap(SYNTHETIC_SESSION) : null;
  const features = coastline ? [] : shelfMounds();
  const sleepShelf = hasIsland ? sleepFeatures(SYNTHETIC_SESSION) : [];
  const bed = buildSeabed({coastline, features: [...features,...sleepShelf]});
  return { bed, uniforms: {
    sleepZones: {value:zones?.texture ?? null}, sleepBounds: {value:zones?.bounds ?? new Vector4(0,0,1,1)},
    hasSleepZones: {value:hasIsland}, uRevealS:{value:-1}, uIslandReveal:{value:0},
    waterNoise: {value: waterNoiseTexture()}, causticEdge: {value: causticEdgeTexture()},
    bedMap: { value: bed.texture }, bedBounds: { value: bed.bounds },
    oceanTime: { value: 0 }, nightAmount: { value: 0 }, reveal: { value: 0 },
  } };
}
export type OceanEnvironment = ReturnType<typeof makeOcean>;
const Context = createContext<OceanEnvironment | null>(null);
export function useOcean() { return useContext(Context)!; }

export function OceanProvider({ replay, night, offset, children, coastline }: {
  replay: Replay; night: boolean; offset: number | null; children: ReactNode; coastline?:SeabedOptions["coastline"];
}) {
  const hasIsland = offset !== null;
  const ocean = useMemo(() => makeOcean(hasIsland,coastline), [hasIsland,coastline]);
  useEffect(() => () => {
    ocean.bed.texture.dispose();
    ocean.uniforms.sleepZones.value?.dispose();
    ocean.uniforms.waterNoise.value.dispose();
    ocean.uniforms.causticEdge.value.dispose();
  }, [ocean]);
  useFrame(() => {
    const seconds = replay.read().seconds;
    ocean.uniforms.oceanTime.value = ambientTime(seconds);
    ocean.uniforms.nightAmount.value = Number(night);
    const t=offset===null?-1:offset+seconds;
    const distance=revealDistanceAt(SYNTHETIC_SESSION,t);
    ocean.uniforms.uRevealS.value=distance;
    ocean.uniforms.uIslandReveal.value=islandRevealAt(SYNTHETIC_SESSION,t);
    ocean.uniforms.reveal.value=Math.max(0,distance/ROUTE_LENGTH);
  }, -1);
  return <Context.Provider value={ocean}>{children}</Context.Provider>;
}
