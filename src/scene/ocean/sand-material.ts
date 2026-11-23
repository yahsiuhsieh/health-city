import type { MeshStandardMaterial } from "three";
import type { OceanEnvironment } from "./OceanEnvironment.tsx";
import { shoreGLSL, waveFrontGLSL } from "./shore-shader.ts";
import { WATER_LEVEL } from "./layers.ts";

const caustics = /* glsl */`
  uniform sampler2D causticEdge;
  float voronoiEdge(vec2 p) {
    return texture2D(causticEdge,p/16.).r;
  }
  float web(vec2 p) {
    p += .22*vec2(sin(1.9*p.y+.08*oceanTime)+.45*sin(2.8*p.x-p.y),
                  cos(1.7*p.x-.06*oceanTime)+.48*cos(2.1*p.y+p.x));
    float a = voronoiEdge(p/1.1 + vec2(.09,-.045)*oceanTime);
    float b = voronoiEdge(mat2(.8,.6,-.6,.8)*p/1.7 + vec2(-.057,.068)*oceanTime);
    return pow(1.-smoothstep(0.,.08,min(a,b)),2.);
  }
`;

type Shader = Parameters<MeshStandardMaterial["onBeforeCompile"]>[0];
export function patchSand(shader: Shader, ocean: OceanEnvironment, surface: "sand" | "seabed" | "cityBeach" = "sand") {
  Object.assign(shader.uniforms, ocean.uniforms);
  shader.vertexShader = "varying vec3 oceanPosition;\n" + shader.vertexShader.replace("#include <project_vertex>",
    "#include <project_vertex>\n oceanPosition = (modelMatrix * vec4(transformed, 1.)).xyz;");
  if(surface==="seabed"){
    shader.vertexShader="uniform sampler2D bedMap; uniform vec4 bedBounds; uniform float reveal;\n"+shader.vertexShader.replace("#include <begin_vertex>",`
      #include <begin_vertex>
      float key=texture2D(bedMap,(position.xz-bedBounds.xy)/bedBounds.zw).b;
      if(key>0.) transformed.y-=16.*(1.-smoothstep(key-.030,key,reveal));
    `);
  }
  if (surface === "cityBeach") {
    shader.vertexShader = `
      attribute vec2 swashDirection;
      uniform float oceanTime;
      ${waveFrontGLSL}
    ` + shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      if (dot(swashDirection,swashDirection)>0.) {
        vec2 origin=transformed.xz;
        // Evaluate the foam phase at the displaced contact, in the same world coordinates as the water.
        vec2 contact=origin+swashDirection*waveFront(wavePhase(origin,oceanTime));
        transformed.xz+=swashDirection*waveFront(wavePhase(contact,oceanTime));
      }
    `);
  }
  shader.fragmentShader = `
    varying vec3 oceanPosition;
    uniform sampler2D bedMap;
    uniform vec4 bedBounds;
    uniform float oceanTime, nightAmount, reveal;
    ${shoreGLSL}
    ${caustics}
  ` + shader.fragmentShader.replace("#include <color_fragment>", `
    #include <color_fragment>
    float shoreFoam=0.;
    float landHeight = oceanPosition.y - ${WATER_LEVEL};
    if (landHeight >= 0. && landHeight < .6) {
      vec4 bank = texture2D(bedMap,(oceanPosition.xz-bedBounds.xy)/bedBounds.zw);
      vec2 wash = shoreWash(oceanPosition.xz,24.*bank.g,oceanTime);
      float beach = max(0.,1.-bank.a)*step(bank.b,reveal)*(1.-smoothstep(.22,.6,landHeight));
      diffuseColor.rgb *= 1.-.18*wash.y*beach;
      shoreFoam = wash.x*beach*mix(.85,.5,nightAmount);
    }
  `).replace("#include <lights_fragment_end>", `
    #include <lights_fragment_end>
    float depthBelow = ${WATER_LEVEL} - oceanPosition.y;
    ${surface === "seabed" ? "if (texture2D(bedMap,(oceanPosition.xz-bedBounds.xy)/bedBounds.zw).b > reveal+.030) discard;" : ""}
    if (depthBelow >= 0. && depthBelow < 4.5) {
      // Direct diffuse already includes the sun angle and the shadow map.
      reflectedLight.directDiffuse += reflectedLight.directDiffuse * vec3(1.,.92,.69) * web(oceanPosition.xz)
        * .55 * (1.-smoothstep(.3,4.5,depthBelow)) * mix(1.,.08,nightAmount);
    }
  `).replace("#include <opaque_fragment>", `
    vec3 foam=mix(vec3(.905,.965,.939),vec3(.328,.474,.509),nightAmount);
    outgoingLight=mix(outgoingLight,foam,shoreFoam);
    #include <opaque_fragment>
  `);
}
