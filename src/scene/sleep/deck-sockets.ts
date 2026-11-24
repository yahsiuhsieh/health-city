export const deckSockets:Record<string,[number,number,number]>={
  "helm":[-2.65,1.3,0],"foredeck":[5.5,1.3,1.05],"bow-windlass":[7.05,1.3,.55],
  "aft-deck":[-7,1.3,0],"ladder-base":[-6.02,1.3,0],"ladder-top":[-5.36,3.76,0],
  "boarding-port":[.54,1.3,-2.53],
};
for(const [side,sign] of [["port",-1],["starboard",1]] as const){
  deckSockets["wh-door-"+side]=[-3.72,1.3,sign*1.8];
  deckSockets["side-"+side+"-fwd"]=[.54,1.3,sign*2.2];
  deckSockets["side-"+side+"-aft"]=[-5.55,1.3,sign*2.18];
  deckSockets["wing-"+side]=[-3.4,3.76,sign*2.30];
}
