import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

export type StreetSurface = "brick" | "slate" | "lawn";

export function streetTexture(kind: StreetSurface) {
  const canvas=document.createElement("canvas");
  canvas.width=canvas.height=512;
  const ctx=canvas.getContext("2d")!;
  let seed=131;
  const random=()=>((seed=Math.imul(1664525,seed)+1013904223>>>0)/4294967296);
  ctx.fillStyle=kind==="lawn"?"#879566":kind==="brick"?"#9c8071":"#938f85";
  ctx.fillRect(0,0,512,512);
  if(kind==="lawn"){
    for(let row=0;row<4;row++){
      ctx.fillStyle=row%2?"#91a075":"#859769";
      ctx.fillRect(0,row*128,512,128);
    }
    for(let i=0;i<30000;i++){
      ctx.fillStyle=i%3?"rgba(57,81,37,.18)":"rgba(208,205,139,.42)";
      ctx.fillRect(random()*512,random()*512,1+random()*2,2+random()*5);
    }
  }else{
    const unit=kind==="brick"?32:64;
    const palette=kind==="brick"?["#ad7360","#b78068","#ae7968","#bb876d"]:["#b8b4a9","#c4bfb1","#b6b4ab","#bdbbb2"];
    for(let j=-1;j<=512/unit;j++) for(let i=-2;i<=512/unit;i++){
      const phase=((i+j)%4+4)%4;
      if(kind==="brick"?phase%2!==0:(i+j)%2!==0)continue;
      const upright=kind==="brick"&&phase===2;
      ctx.fillStyle=palette[Math.floor(random()*4)]!;
      ctx.fillRect(i*unit+1,j*unit+1,unit*(upright?1:2)-2,unit*(upright?2:1)-2);
    }
  }
  const texture=new CanvasTexture(canvas);
  texture.wrapS=texture.wrapT=RepeatWrapping;
  texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;
  return texture;
}
