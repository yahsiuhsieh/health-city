import { AdditiveBlending, CanvasTexture, Mesh, Sprite, SpriteMaterial, Vector3 } from "three";
import type { Object3D, MeshStandardMaterial } from "three";

const sectors=[
  {name:"masthead",bearing:0,halfArc:112.5},
  {name:"port",bearing:-56.25,halfArc:56.25},
  {name:"starboard",bearing:56.25,halfArc:56.25},
  {name:"stern",bearing:180,halfArc:67.5},
  {name:"anchor",bearing:0,halfArc:180},
] as const;
export function navigationLights(boat:Object3D){
  const canvas=document.createElement("canvas");canvas.width=canvas.height=48;
  const ctx=canvas.getContext("2d")!;
  const gradient=ctx.createRadialGradient(24,24,0,24,24,24);
  gradient.addColorStop(0,"white");gradient.addColorStop(.23,"rgba(255,255,255,.48)");
  gradient.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=gradient;ctx.fillRect(0,0,48,48);
  const map=new CanvasTexture(canvas);
  const lamps=sectors.map(sector=>{
    const node=boat.getObjectByName("light-"+sector.name)!;
    const lens=node.children[0] as Mesh;
    const glow=new Sprite(new SpriteMaterial({map,color:(lens.material as MeshStandardMaterial).color,transparent:true,
      depthWrite:false,blending:AdditiveBlending,toneMapped:false}));
    glow.scale.setScalar(1.05);node.add(glow);
    return {...sector,node,glow};
  });
  const direction=new Vector3();
  return {
    update(camera:Object3D,night:boolean,underway:boolean,anchored:boolean){
      // The orthographic camera shares one sight direction across its entire field.
      camera.getWorldDirection(direction).negate();
      const yaw=boat.parent?.rotation.y??0;
      const bearing=(Math.atan2(direction.z,direction.x)+yaw)*180/Math.PI;
      for(const lamp of lamps){
        const delta=((bearing-lamp.bearing+540)%360)-180;
        lamp.node.visible=night && (lamp.name==="anchor"?anchored:underway) && Math.abs(delta)<=lamp.halfArc;
      }
    },
    dispose(){for(const lamp of lamps){lamp.glow.removeFromParent();lamp.glow.material.dispose();}map.dispose();},
  };
}
