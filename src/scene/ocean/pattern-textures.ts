import { DataTexture, LinearFilter, RedFormat, RGBAFormat, RepeatWrapping } from "three";

function tiledTexture(pixels:Uint8Array, size:number, packed=false) {
  const map=new DataTexture(pixels,size,size,packed ? RGBAFormat : RedFormat);
  map.wrapS=map.wrapT=RepeatWrapping;
  map.magFilter=map.minFilter=LinearFilter;
  map.needsUpdate=true;
  return map;
}

const fract=(v:number)=>v-Math.floor(v);
export function waterNoiseTexture() {
  const size=256, pixels=new Uint8Array(size*size);
  const f=Math.fround;
  for(let z=0;z<size;z++) for(let x=0;x<size;x++) {
    const a=fract(f((x<128?x:x-size)*f(.1031)));
    const b=fract(f((z<128?z:z-size)*f(.1031)));
    const d=f(f(a*f(b+f(33.33)))+f(b*f(a+f(33.33)))+f(a*f(a+f(33.33))));
    pixels[z*size+x]=Math.round(255*fract(f(f(f(a+d)+f(b+d))*f(a+d))));
  }
  // Pack offset samples so each pair of ripple slopes needs only one texture read.
  const packed=new Uint8Array(size*size*4);
  for(let z=0;z<size;z++) for(let x=0;x<size;x++) {
    const i=4*(z*size+x);
    for(const [channel,offset] of [0,11,7,17].entries())
      packed[i+channel]=pixels[((z+offset)%size)*size+(x+offset)%size]!;
  }
  return tiledTexture(packed,size,true);
}

export function causticEdgeTexture() {
  const cells=16, size=512, pixels=new Uint8Array(size*size);
  const sites=new Float32Array(cells*cells*2);
  let seed=8745;
  for(let i=0;i<sites.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    sites[i]=.15+.7*seed/4294967296;
  }
  for(let z=0;z<size;z++) for(let x=0;x<size;x++){
    const px=(x+.5)*cells/size, pz=(z+.5)*cells/size;
    const cx=Math.floor(px), cz=Math.floor(pz);
    let first=Infinity, second=Infinity, ax=0, az=0, bx=0, bz=0;
    for(let j=-1;j<=1;j++) for(let i=-1;i<=1;i++) {
      const ix=cx+i, iz=cz+j;
      const index=2*(((iz+cells)%cells)*cells+(ix+cells)%cells);
      const dx=ix+sites[index]!-px, dz=iz+sites[index+1]!-pz, d=dx*dx+dz*dz;
      if(d<first) {
        second=first;bx=ax;bz=az;
        first=d;ax=dx;az=dz;
      } else if(d<second) {
        second=d;bx=dx;bz=dz;
      }
    }
    const edge=.5*(second-first)/Math.hypot(ax-bx,az-bz);
    pixels[z*size+x]=Math.round(255*Math.min(1,edge));
  }
  return tiledTexture(pixels,size);
}
