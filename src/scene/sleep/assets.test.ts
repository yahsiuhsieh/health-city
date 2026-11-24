import {readFile} from "node:fs/promises";
import { Box3,Mesh,Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {expect,it} from "vitest";

it("loads the sleep assets within the mesh and delivery budgets",async()=>{
  for(const file of ["sleep-world","sea-life"]){
    const bytes=await readFile(new URL("../../../public/models/"+file+".glb",import.meta.url));
    expect(bytes.byteLength).toBeLessThan(3*1024*1024);
    const {scene,animations}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
    const limits:Record<string,number>={};
    const families: [string,number,number][]=[["palm",3,800],["broadleaf",3,800],["shrub",2,160],
      ...["coral-table","coral-plate","coral-boulder","coral-brain","coral-branch","sponge-tubes","sea-fan","soft-coral",
        "grass","driftwood","beach-rock","bommie","jetty-plank","jetty-pile","jetty-fender","jetty-bollard","jetty-ladder","jetty-lamp"]
        .map(n=>[n,1,650] as [string,number,number])];
    if(file==="sleep-world"){
      for(const [prefix,n,max] of families)for(let i=0;i<n;i++)limits[prefix+"-"+String.fromCharCode(97+i)]=max;
      for(const [family,variants,min,max] of [["palm",3,8,15],["broadleaf",3,8,12],["shrub",2,.8,1.5]] as const){
        for(let i=0;i<variants;i++){
          const m=scene.getObjectByName(family+"-"+String.fromCharCode(97+i))!;
          const extent=new Box3().setFromObject(m).getSize(new Vector3());
          expect(extent.y).toBeGreaterThanOrEqual(min);expect(extent.y).toBeLessThanOrEqual(max);
          if(family==="broadleaf"){expect(extent.x).toBeGreaterThanOrEqual(6);expect(extent.x).toBeLessThanOrEqual(12);}
        }
      }
      Object.assign(limits,{"wake-buoy":1200,"wake-buoy-lens":1200,"wake-buoy-topmark":1200});
    }else{
      expect(animations.map(clip=>clip.name)).toEqual(["bow-ride","leap"]);
      Object.assign(limits,{ray:900,whale:2400,shark:1600,"school-fish":60,"flying-fish":150,booby:350,tern:350,dolphin:700});
      for(const [name,axis,size] of [["ray","z",4.5],["whale","x",13],["shark","x",9],["dolphin","x",2.4],
        ["school-fish","x",.33],["booby","z",1.4],["tern","z",.8],["flying-fish","x",.45]] as const){
        const actual=new Box3().setFromObject(scene.getObjectByName(name)!).getSize(new Vector3())[axis];
        expect(Math.abs(actual/size-1),name).toBeLessThan(.1);
      }
      for(const name of ["ray-body","ray-wing-left","ray-wing-right","ray-tail","whale-body","whale-flukes","shark-body","shark-dorsal","shark-tail"])
        expect(scene.getObjectByName(name)).toBeDefined();
    }
    for(const [name,max] of Object.entries(limits)){
      const node=scene.getObjectByName(name);expect(node,name).toBeDefined();
      let triangles=0;node!.traverse(o=>{if(o instanceof Mesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
      expect(triangles,name).toBeLessThanOrEqual(max);
    }
  }
});
