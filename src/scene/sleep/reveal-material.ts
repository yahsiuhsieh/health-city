import type { MeshStandardMaterial, MeshDepthMaterial, Vector3 } from "three";
export interface RevealUniforms {
  uRevealS:{value:number};
  uFollow:{value:number};
  uBoat:{value:Vector3};
  uEye:{value:Vector3};
  oceanTime:{value:number};
}
export function patchReveal(material:MeshStandardMaterial|MeshDepthMaterial, uniforms:RevealUniforms, occluder=false, sway=false) {
  material.customProgramCacheKey=()=>`sleep-reveal-${occluder}-${sway}`;
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=`attribute float routeS;
      varying float sleepKey;
      varying vec3 sleepWorld;
      uniform float oceanTime,uRevealS;
    `+shader.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
      sleepKey=routeS;
      #ifndef USE_INSTANCING
        transformed.y=mix(-.45,transformed.y,smoothstep(routeS-3.,routeS,uRevealS));
      #endif
      vec4 base=vec4(transformed,1.);
      #ifdef USE_INSTANCING
        base=instanceMatrix*base;
      #endif
      sleepWorld=(modelMatrix*base).xyz;
      ${occluder?`
      #ifdef USE_INSTANCING
        transformed.x+=position.y*.025*sin(oceanTime*.65+sleepWorld.x*.23);
      #endif`:""}
      ${sway?"transformed.x+=.06*position.y*position.y*sin(oceanTime*1.3+sleepWorld.x+sleepWorld.z);":""}
    `);
    shader.fragmentShader=`uniform float uRevealS, uFollow;
      uniform vec3 uBoat,uEye;
      varying float sleepKey;
      varying vec3 sleepWorld;
    `+shader.fragmentShader.replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
      float cover=smoothstep(sleepKey-3.,sleepKey,uRevealS);
      ${occluder?`vec3 line=uEye-uBoat;
        float along=dot(sleepWorld-uBoat,line)/max(.01,dot(line,line));
        if(uFollow>.5 && along>0. && along<1.) cover*=mix(.3,1.,smoothstep(4.,5.,length(sleepWorld-uBoat-line*along)));`:""}
      if(cover<=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))) discard;
    `);
  };
}
