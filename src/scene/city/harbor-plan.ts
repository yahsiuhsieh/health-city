export const WORK_BOAT_BERTH={position:[150,-25.1] as const,yaw:0};
export const INNER_MOUTH={point:[27,-6] as const,direction:[1,0] as const};
export const OUTER_MOUTH={point:[185,-23.6] as const,direction:[1,0] as const};
export const turningBasin={center:[64,-3] as const,radius:27};
export const workingQuay={start:135,end:175,edge:-28.5,back:-43,top:1.6};
export const cargoQuay={edge:-3.425,start:-81,end:-11,top:1.6};
export const breakwaterArms=[
  [[-15,-80],[14,-85],[23,-81],[27,-72],[27,-22]],
  [[-22,78],[21,82],[32,76],[37,63],[36,23],[29,16]],
  [[27,-43],[174,-46],[185,-43]],
  [[36,23],[44,38],[162,38],[178,23],[185,-4.2]],
] as const;
// A westbound vessel has starboard toward negative Z. The inner marks retain their colors.
export const armMarks=["green","red","red","green"] as const;
export const freighter={x:2.35,z:-50,length:58,deckHeight:4.68} as const;
export const berths=[
  {name:"Freighter",x:freighter.x,z:freighter.z,yaw:-Math.PI/2},
  {name:"WaterTaxi",x:3.8,z:46.65,yaw:0},
  {name:"Trawler",x:6.7,z:17.55,yaw:0},
  {name:"Trawler",x:6.7,z:27.55,yaw:0},
  {name:"Tug",x:8.6,z:38.6,yaw:0},
  ...[1,9,17,25].flatMap((x,i)=>[
    {name:i%2?"Motorboat":"Schooner",x,z:i%2?55.5:53.55,yaw:-Math.PI/2},
    {name:i%2?"Schooner":"Motorboat",x,z:i%2?66.45:64.5,yaw:Math.PI/2},
  ]),
];

export const vesselLengths:Record<string,number>={WorkingBoat:20,Freighter:58,Trawler:20,Tug:24,Schooner:11.2,Motorboat:7,WaterTaxi:12};
export const vesselBeams:Record<string,number>={WorkingBoat:5.6,Freighter:10.5,Trawler:6.5,Tug:9,Schooner:3.4,Motorboat:2.4,WaterTaxi:4};
export function swellAmplitude(length:number){
  return .06-.04*Math.min(1,Math.max(0,(length-7)/51));
}
