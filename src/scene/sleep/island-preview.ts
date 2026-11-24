import { islandTerrain } from "./island-shape.ts";
import { SYNTHETIC_SESSION } from "./session.ts";
let cached:ReturnType<typeof islandTerrain>|undefined;
export function destination(){
  if(cached)return cached;
  const raw=import.meta.env.DEV && typeof window!=="undefined"?new URLSearchParams(window.location.search).get("sleepPreview"):null;
  const minutes=Number(raw);
  return cached=islandTerrain(SYNTHETIC_SESSION,[20,60,180,442,720].includes(minutes)?minutes:undefined);
}
