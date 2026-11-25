// The replay can supply a solar elevation here when location-based daylight is available.
const stops = [
  { elevation:-18, sun:"#b5cfe5", sky:"#9fb6c8", ground:"#2f4448", zenith:"#152935", air:"#1f3541", intensity:.8, fill:.9 },
  { elevation:-9, sun:"#bfc8ed", sky:"#899ac2", ground:"#55596a", zenith:"#394561", air:"#526383", intensity:.9, fill:.92 },
  { elevation:-3, sun:"#edb4a3", sky:"#adb5d0", ground:"#6c6868", zenith:"#7b89a2", air:"#9b9caf", intensity:1.1, fill:.98 },
  { elevation:3, sun:"#ffd298", sky:"#e6d0be", ground:"#908578", zenith:"#bac9db", air:"#e9c4a8", intensity:2.1, fill:1.05 },
  { elevation:53.3, sun:"#fff1d6", sky:"#dce8ef", ground:"#8a8f7f", zenith:"#bfd9eb", air:"#cfe0ea", intensity:3, fill:1.2 },
] as const;

function mixColor(a:string,b:string,t:number){
  const rgb=[1,3,5].map(i=>{
    const low=parseInt(a.slice(i,i+2),16),high=parseInt(b.slice(i,i+2),16);
    return Math.round(low+(high-low)*t).toString(16).padStart(2,"0");
  });
  return "#"+rgb.join("");
}
export function lightingAt(elevation:number){
  const high=stops.findIndex(s=>s.elevation>=elevation);
  const b=stops[high<0?stops.length-1:high]!,a=stops[Math.max(0,(high<0?stops.length-1:high)-1)]!;
  const t=a===b?0:Math.max(0,Math.min(1,(elevation-a.elevation)/(b.elevation-a.elevation)));
  const brightness=Math.max(0,Math.min(1,(-2-elevation)/10));
  const angle=Math.max(14,Math.abs(elevation))*Math.PI/180;
  return {
    sun:mixColor(a.sun,b.sun,t),sky:mixColor(a.sky,b.sky,t),ground:mixColor(a.ground,b.ground,t),
    zenith:mixColor(a.zenith,b.zenith,t),air:mixColor(a.air,b.air,t),intensity:a.intensity+(b.intensity-a.intensity)*t,fill:a.fill+(b.fill-a.fill)*t,
    direction:[.765*Math.cos(angle),Math.sin(angle),.644*Math.cos(angle)] as const,
    streetLamps:brightness,windowLights:brightness,glassTint:mixColor("#f0f8f5","#101a22",brightness),
  };
}
export const cityLight={day:lightingAt(53.3),night:lightingAt(-18)};
