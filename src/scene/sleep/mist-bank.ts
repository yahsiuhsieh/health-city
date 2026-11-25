import { DataTexture,LinearFilter,RedFormat,Vector2 } from "three";
import { clamp01, type IslandTerrain } from "./island-shape.ts";

export function mistBank(land:IslandTerrain) {
  const {center,radius,seed}=land;
  const phase=seed%(2*Math.PI);
  const halfX=2.18*radius,halfZ=1.86*radius;
  function density(x:number,z:number) {
    const dx=(x-center[0])/radius,dz=(z-center[1])/radius;
    const along=.91*dx+.41*dz;
    const across=-.41*dx+.91*dz+.13*Math.sin(2.6*along+phase);
    function wisp(offset:number,lane:number,length:number,width:number){
      const edge=Math.hypot((along-offset)/length,(across-lane)/width);
      const u=clamp01((1-edge)/.43);
      return u*u*(3-2*u);
    }
    const main=wisp(.06,0,1.64,.86);
    const north=wisp(-.32,-.72,1.28,.66);
    const south=wisp(.40,.66,1.30,.64);
    return 1-(1-main)*(1-north)*(1-south);
  }
  return {center,halfX,halfZ,density};
}

export function mistTexture(land:IslandTerrain){
  const {center,halfX,halfZ,density}=mistBank(land);
  const width=Math.ceil(halfX*2),height=Math.ceil(halfZ*2),data=new Uint8Array(width*height);
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
    const x=center[0]+((i+.5)/width*2-1)*halfX,z=center[1]+(1-(j+.5)/height*2)*halfZ;
    data[j*width+i]=Math.round(255*density(x,z));
  }
  const mask=new DataTexture(data,width,height,RedFormat);
  mask.unpackAlignment=1;mask.magFilter=mask.minFilter=LinearFilter;mask.needsUpdate=true;
  return {center,halfX,halfZ,mask,uniforms:{
    bankMask:{value:mask},bankExtent:{value:new Vector2(halfX,-halfZ)},
    mistCenter:{value:new Vector2(...center)},mistRadius:{value:land.radius},
    mistSeed:{value:land.seed%31},jetty:{value:new Vector2(...land.pier)},
    reach:{value:Math.max(...land.polygon.map(([x,z])=>Math.hypot(x-land.pier[0],z-land.pier[1])))},
  }};
}

export const driftingMistGLSL = /* glsl */`
  uniform sampler2D bankMask;
  uniform vec2 bankExtent,mistCenter,jetty;
  uniform float mistRadius,mistSeed,reach;

  float driftingMist(vec2 worldXZ){
    vec2 local=(worldXZ-mistCenter)/mistRadius;
    vec2 wind=vec2(.91,.41);
    vec2 flow=vec2(dot(local,wind)-.095*oceanTime,dot(local,vec2(-wind.y,wind.x)));
    vec2 seed=vec2(mistSeed,2.7);
    float bend=oceanNoise(flow*vec2(1.6,1.1)+seed)-.5;
    float curls=oceanNoise(flow*vec2(3.,4.8)-seed)-.5;
    float lane=flow.y+.38*bend+.12*curls+.16*flow.x;
    float ribbon=1.-smoothstep(.14,.45,abs(fract(1.86*lane+.5)-.5));
    float patches=oceanNoise(flow*vec2(2.3,3.6)+seed+8.);
    float vapor=.05+.57*ribbon*smoothstep(.16,.79,patches)+.11*patches;
    float footprint=texture2D(bankMask,.5+.5*(worldXZ-mistCenter)/bankExtent).r;
    float delay=.46*clamp(distance(worldXZ,jetty)/reach,0.,1.);
    return footprint*vapor*(1.-smoothstep(delay,delay+.54,uIslandReveal));
  }
`;
