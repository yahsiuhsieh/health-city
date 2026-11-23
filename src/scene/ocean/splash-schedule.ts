export const CELL_SIZE=40, SPLASH_PERIOD=30, EVENT_POOL=24;
export interface SplashEvent {
  x:number; z:number; start:number; seed:number; angle:number; height:number; length:number; drops:number;
}
export interface SeaCell { x:number; z:number }
export function splashAge(time:number, event:SplashEvent) {
  return ((time-event.start)%SPLASH_PERIOD+SPLASH_PERIOD)%SPLASH_PERIOD;
}

export function scheduledSplashes(cell:SeaCell, depthAt:(x:number,z:number)=>number,
  paths:readonly {x:number;z:number}[]): SplashEvent[] {
  let state=(Math.imul(cell.x,73856093)^Math.imul(cell.z,19349663)^0x9e3779b9)>>>0;
  const random=()=>{
    state=(state+0x6d2b79f5)>>>0;
    let a=Math.imul(state^(state>>>15),state|1);
    a^=a+Math.imul(a^(a>>>7),a|61);
    return ((a^(a>>>14))>>>0)/4294967296;
  };
  const count=Math.floor(random()*3), events:SplashEvent[]=[];
  for(let n=0;n<count;n++) {
    const x=(cell.x+random())*CELL_SIZE, z=(cell.z+random())*CELL_SIZE;
    const event={x,z,start:random()*SPLASH_PERIOD,seed:random(),angle:random()*2*Math.PI,
      height:.5+.3*random(),length:1.2+.6*random(),drops:8+Math.floor(5*random())};
    const dx=event.length*Math.cos(event.angle), dz=event.length*Math.sin(event.angle);
    if ([0,.5,1].some(u=>depthAt(x+u*dx,z+u*dz)<=4)) continue;
    const nearPath=paths.some(p=>{
      const u=Math.max(0,Math.min(1,((p.x-x)*dx+(p.z-z)*dz)/event.length**2));
      return (p.x-x-u*dx)**2+(p.z-z-u*dz)**2<=12.5**2;
    });
    if (!nearPath) events.push(event);
  }
  return events;
}

// Limit each ten-unit interval to one visible event, even at overview zoom.
export function visibleSchedule(candidates: readonly SplashEvent[]) {
  const slots:(SplashEvent | undefined)[]=[];
  for(const e of candidates) {
    const slot=Math.floor(e.start/10);
    if(!slots[slot] || e.seed<slots[slot]!.seed) slots[slot]=e;
  }
  return slots.filter((event): event is SplashEvent=>!!event);
}
