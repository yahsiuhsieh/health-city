import type { MeshStandardMaterial } from "three";
import { WATER_LEVEL } from "../ocean/layers.ts";

export const animalMotion={
  whale:{amplitude:1.92,frequency:.3},
  shark:{amplitude:1.2,frequency:.4},
  dolphin:{amplitude:.6,frequency:1.2},
  ray:{amplitude:1.6,frequency:.5},
  booby:{amplitude:35*Math.PI/180,frequency:3},
  tern:{amplitude:35*Math.PI/180,frequency:3},
  "flying-fish":{amplitude:.18,frequency:6},
};
type Species=keyof typeof animalMotion;
type Uniform={value:number};

export function animalDeformation(kind:Species){
  const {amplitude,frequency}=animalMotion[kind];
  const bird=kind==="booby"||kind==="tern",fish=kind==="flying-fish";
  const phase='(6.2831853 * '+frequency.toFixed(3)+' * animalTime + offset)';
  const wave=amplitude.toFixed(4)+' * weight * sin('+phase+' - 4.1 * _along)';

  if(bird){
    return `float wing=max(0.,abs(position.z)-.12);
      float flap=${amplitude.toFixed(5)} * sin(${phase}) * smoothstep(.0,.35,sin(animalTime*1.65+offset));
      transformed.y+=wing*sin(flap);
      transformed.z+=sign(position.z)*wing*(cos(flap)-1.);`;
  }else if(kind==="ray"){
    return `float span=clamp((abs(position.z)-.58)/3.42,0.,1.);
      transformed.y+=${amplitude.toFixed(3)}*span*span*sin(${phase}-1.9*span-3.4*_along);`;
  }else{
    return `float weight=_along*_along;
      transformed.${kind==="shark"||fish?"z":"y"}+=${wave}${fish?" * launchBeat":""};`;
  }
}

export function animalMaterial(source:MeshStandardMaterial,kind:Species,time:Uniform,waterPass:Uniform,daylight:Uniform,curve:Uniform){
  const material=source.clone();
  const bird=kind==="booby"||kind==="tern",fish=kind==="flying-fish";
  const submerged=!bird&&!fish;
  material.name=kind+" skin";
  material.customProgramCacheKey=()=>kind+"-swim";
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,{animalTime:time,waterPass,skinDay:daylight,pathCurve:curve});
    shader.vertexShader='uniform float animalTime,pathCurve; attribute float _along; varying float skinY;\n'+
      (fish?'attribute float launchBeat;\n':'')+shader.vertexShader.replace("#include <begin_vertex>",`
        #include <begin_vertex>
        float offset=0.;
        #ifdef USE_INSTANCING
          offset=float(gl_InstanceID)*1.71;
        #endif
        ${animalDeformation(kind)}
        transformed.z+=pathCurve*_along*_along;
        vec4 animalPoint=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          animalPoint=instanceMatrix*animalPoint;
        #endif
        skinY=(modelMatrix*animalPoint).y;
      `);
    if(fish){
      shader.vertexShader="varying float finGlint;\n"+shader.vertexShader.replace("skinY=(modelMatrix",
        "finGlint=smoothstep(.12,.35,abs(position.z))*pow(.5+.5*cos(animalTime*5.+offset+position.z),8.);\n        skinY=(modelMatrix");
      shader.fragmentShader="uniform float skinDay; varying float finGlint;\n"+shader.fragmentShader.replace(
        "#include <lights_fragment_end>","#include <lights_fragment_end>\n reflectedLight.directSpecular+=vec3(.85,.93,1.)*finGlint*skinDay;");
    }
    if(submerged){
      shader.fragmentShader="uniform float waterPass; varying float skinY;\n"+shader.fragmentShader.replace(
        "#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
        if((skinY < ${WATER_LEVEL}) != (waterPass > .5))discard;`);
    }
  };
  if(fish){material.roughness=.23;material.metalness=.3;}
  return material;
}
