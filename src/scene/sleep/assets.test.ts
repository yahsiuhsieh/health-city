import {readFile} from "node:fs/promises";
import { Mesh } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {expect,it} from "vitest";

it("loads the sleep assets within the mesh and delivery budgets",async()=>{
  for(const file of ["sleep-world","sea-life"]){
    const bytes=await readFile(new URL("../../../public/models/"+file+".glb",import.meta.url));
    expect(bytes.byteLength).toBeLessThan(3*1024*1024);
    const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),"");
    const limits:Record<string,number>={};
    const families: [string,number,number][]=[["tree-conifer",3,450],["tree-umbrella",2,750],["reed-clump",3,400],["seagrass",2,120],
      ...["coral-boulder","coral-tiered","coral-table","coral-plate","sponge-tubes","anemone","coral-branch"].map(n=>[n,2,350] as [string,number,number]),
      ["coral-tube",1,350],["glow-anemone",1,350],["glow-plant",2,300],["rock",3,200],["rubble",2,200],["shrub",2,250],["tussock",1,250]];
    if(file==="sleep-world"){
      for(const [prefix,n,max] of families)for(let i=0;i<n;i++)limits[prefix+"-"+String.fromCharCode(97+i)]=max;
      Object.assign(limits,{"wake-buoy":1200,"wake-buoy-lens":1200,"wake-buoy-topmark":1200});
    }else{
      Object.assign(limits,{ray:900,whale:1600,shark:1000,"fish-a":60,"fish-b":60});
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
