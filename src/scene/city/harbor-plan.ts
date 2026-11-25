export const WORK_BOAT_BERTH = {position: [48,-102.5] as const, yaw: 0};
export const HARBOR_MOUTH = {point: [69,-101] as const, direction: [1,0] as const};
export const turningBasin = {center: [7,-101] as const, radius: 18};
export const workingQuay = {start: 33, end: 63, edge: -105.9, back: -116, top: 1.6};
export const marketQuay={edge:-3.425,start:-65,end:-11,top:1.6};
export const breakwaterArms = [
  [[-23,-106],[-11,-131],[48,-131],[69,-121]],
  [[-13,-68],[3,-60],[25,-60],[32,-68]],
] as const;
// On the westbound approach, starboard is on the negative-Z side.
export const armMarks = ["red","green"] as const;
export const berths=[
  {name:"FishingBoat",x:.3,z:-50,yaw:-Math.PI/2},
  {name:"FishingBoat",x:.3,z:-36,yaw:-Math.PI/2},
  {name:"CrabBoat",x:.4,z:-21,yaw:-Math.PI/2},
  {name:"WaterTaxi",x:3.8,z:46.65,yaw:0},
  {name:"Trawler",x:6.7,z:17.55,yaw:0},
  ...[1,9].flatMap((x,i)=>[
    {name:i?"Motorboat":"Schooner",x,z:i?55.5:53.55,yaw:-Math.PI/2},
    {name:i?"Schooner":"Motorboat",x,z:i?66.45:64.5,yaw:Math.PI/2},
  ]),
];

export const vesselLengths:Record<string,number>={WorkingBoat:20,FishingBoat:9,CrabBoat:9.8,Trawler:20,Schooner:11.2,Motorboat:7,WaterTaxi:12};
export const vesselBeams:Record<string,number>={WorkingBoat:5.6,FishingBoat:3,CrabBoat:3.6,Trawler:6.5,Schooner:3.4,Motorboat:2.4,WaterTaxi:4};
export function swellAmplitude(length:number){
  return .06-.04*Math.min(1,Math.max(0,(length-7)/51));
}
