import { islandShape } from "./island-shape.ts";
import { SYNTHETIC_SESSION } from "./session.ts";
let cached:ReturnType<typeof islandShape>|undefined;
export function destination(){
  if(cached)return cached;
  const raw=import.meta.env.DEV && typeof window!=="undefined"?new URLSearchParams(window.location.search).get("sleepPreview"):null;
  const minutes=Number(raw);
  return cached=islandShape(SYNTHETIC_SESSION,[5,20,60,180,442,720].includes(minutes)?minutes:undefined);
}
