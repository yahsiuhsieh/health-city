import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color, HalfFloatType, Matrix4, Mesh, Plane, PlaneGeometry,
  ShaderMaterial, Vector3, WebGLRenderTarget,
} from "three";
import type { Replay } from "../core/replay.ts";

import { coastalDepth } from "./coastal-depth.ts";

const WATER_LEVEL = -0.025;

// Height and slopes share the same waves, so light follows the moving surface.
const waves = /* glsl */`
  vec3 waterWaves(vec2 p, float t) {
    float bendX = cos(p.x * .23 - t * .04) * .15 * .23;
    float bendY = cos(p.y * .31 + t * .05) * .15 * .31;
    p += vec2(sin(p.y * .31 + t * .05), sin(p.x * .23 - t * .04)) * .15;
    // Incoming crests curve and taper across the wind, so individual waves can be followed.
    vec2 travel = vec2(-.94, .34);
    vec2 across = vec2(-travel.y, travel.x);
    float crosswind = dot(p, across);
    float groupPhase = crosswind * .34 + dot(p, travel) * .13 - t * .18;
    float amplitude = .089 + .064 * sin(groupPhase);
    float bend = crosswind * .48 + .31 * t;
    float swell = dot(p,travel)*.91 - t*1.54 + .96*sin(bend) + .72*sin(groupPhase);
    vec2 gradient = amplitude*cos(swell)*(.91*travel + .4608*cos(bend)*across + .72*cos(groupPhase)*(.34*across+.13*travel));
    gradient += sin(swell)*.064*cos(groupPhase)*(.34*across+.13*travel);
    vec3 wave = vec3(amplitude*sin(swell), gradient);
    vec2 direction = vec2(.78, .63);
    float phase = dot(p, direction) * 1.48 - t * .8;
    wave += vec3(sin(phase), cos(phase) * direction * 1.48) * .032;
    direction = vec2(-.91, .41);
    phase = dot(p, direction) * 2.7 + t * .64;
    wave += vec3(sin(phase), cos(phase) * direction * 2.7) * .018;
    direction = vec2(.36, -.93);
    phase = dot(p, direction) * 5.4 - t * 1.04;
    wave += vec3(sin(phase), cos(phase) * direction * 5.4) * .009;
    return vec3(wave.x, wave.y + bendX * wave.z, wave.z + bendY * wave.y);
  }
`;

const vertexShader = waves + /* glsl */`
  uniform mat4 reflectionMatrix;
  uniform float replayTime;
  varying vec3 surfacePosition;
  varying vec4 reflectionPosition;
  void main() {
    vec3 point = position;
    vec3 worldPoint = (modelMatrix * vec4(point, 1.0)).xyz;
    point.z += waterWaves(worldPoint.xz, replayTime).x;
    surfacePosition = (modelMatrix * vec4(point, 1.0)).xyz;
    reflectionPosition = reflectionMatrix * vec4(point, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(point, 1.0);
  }
`;

const fragmentShader = waves + /* glsl */`
  uniform sampler2D reflectionMap;
  uniform sampler2D depthMap;
  uniform vec4 coastBounds;
  uniform float distanceRange;
  uniform vec3 deepColor;
  uniform vec3 coastalColor;
  uniform vec3 shallowColor;
  uniform vec3 foamColor;
  uniform vec3 skyColor;
  uniform vec3 reflectionSkyColor;
  uniform vec3 viewDirection;
  uniform vec3 lightColor;
  uniform float replayTime;
  uniform float nightAmount;
  uniform bool wideView;
  uniform float cameraDepthOffset;
  varying vec3 surfacePosition;
  varying vec4 reflectionPosition;

  float cellValue(vec2 cell) {
    vec3 p = fract(cell.xyx * .1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float surfaceNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 blend = fract(p);
    blend = blend * blend * (3.0 - 2.0 * blend);
    return mix(
      mix(cellValue(cell), cellValue(cell + vec2(1, 0)), blend.x),
      mix(cellValue(cell + vec2(0, 1)), cellValue(cell + vec2(1, 1)), blend.x),
      blend.y
    );
  }

  void main() {
    vec2 p = surfacePosition.xz;
    vec3 wave = waterWaves(p, replayTime);
    float pixelSpan = max(length(dFdx(p)), length(dFdy(p)));
    float fineDetail = 1.0 - smoothstep(.09, .28, pixelSpan);
    vec2 drift = vec2(replayTime * .13, replayTime * -.09);
    float surfacePatch = surfaceNoise(p * 1.55 + drift);
    float foamPatch = surfaceNoise(p * vec2(3.2, 1.8) + drift * 2.0);
    vec2 ripplePoint = p + (vec2(surfacePatch, foamPatch) - .5) * .54;
    // Fine ripples change reflections without displacing the mesh.
    vec2 rippleSlope = vec2(.83, .56) * sin(dot(ripplePoint, vec2(8.1, 5.5)) - replayTime * 1.1);
    rippleSlope += vec2(-.38, .92) * sin(dot(ripplePoint, vec2(-5.4, 13.2)) + replayTime * 1.6) * .65;
    vec2 slope = wave.yz + rippleSlope * (.07 * fineDetail);
    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
    vec3 view = viewDirection;

    vec2 depth = texture2D(depthMap, (p-coastBounds.xy)/coastBounds.zw).rg;
    float bankDistance = depth.r * distanceRange;
    float shelf = 1.0 - smoothstep(.08, 1.0, depth.g);
    float shallows = 1.0 - smoothstep(.0, .74, depth.g);
    vec3 water = mix(deepColor, coastalColor, shelf);
    water = mix(water, shallowColor, shallows * .86);
    water *= 1.0 + dot(normal.xz, vec2(.65, -.36)) + (surfacePatch - .5) * .21;
    float crest = smoothstep(.036,.155,wave.x);
    float streak = smoothstep(.27,.82,surfaceNoise(p*.37 + drift*.5));
    water = mix(water, shallowColor, crest*(.026 + .14*streak)*(1.0-.5*shallows));
    vec3 reflectedView = reflect(-view, normal);
    float sunlight = max(dot(reflectedView, normalize(vec3(-.48, .75, -.46))), 0.0);
    float glintPatch = mix(.32, 1.0, smoothstep(.43, .8, surfacePatch));
    float glint = pow(sunlight, 190.0) * .13 * glintPatch + pow(sunlight, 18.0) * .018;
    water += lightColor * glint * (1.0 - nightAmount * .8);

    float fresnel = pow(1.0 - max(dot(normal, view), 0.0), 3.0);
    vec2 uv = reflectionPosition.xy / reflectionPosition.w;
    uv -= slope * .043;
    uv = clamp(uv, vec2(.02), vec2(.98));
    vec3 reflection = texture2D(reflectionMap, uv).rgb * .5;
    reflection += texture2D(reflectionMap, uv + vec2(.0017, .0008)).rgb * .25;
    reflection += texture2D(reflectionMap, uv - vec2(.0017, .0008)).rgb * .25;
    float objectReflection = smoothstep(.06, .2, length(reflection - reflectionSkyColor));
    water = mix(water, reflection, .07 + objectReflection * .18 + fresnel * .28 + nightAmount * .08);

    // Break up the foam along the bank and fade it into the open sea.
    float wash = bankDistance - .45 - wave.x * 6.5;
    float foamEdge = 1.0 - smoothstep(.08, .94, abs(wash));
    float lace = smoothstep(.35,.72,foamPatch);
    float foam = foamEdge * (.18+.82*crest) * mix(.48,lace,fineDetail);
    water = mix(water, foamColor, foam * mix(.72,.29,nightAmount));

    vec3 cameraOffset = cameraPosition - view * cameraDepthOffset - surfacePosition;
    if (!wideView) {
      water = mix(water, skyColor, smoothstep(42.0, 105.0, length(cameraOffset)));
    }
    gl_FragColor = vec4(water, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    if (wideView) {
      float viewDepth = dot(cameraOffset, view);
      float horizon = smoothstep(165.0, 275.0, viewDepth);
      gl_FragColor = mix(gl_FragColor, linearToOutputTexel(vec4(reflectionSkyColor, 1.0)), horizon);
    }
  }
`;

function waterGeometry() {
  const geometry = new PlaneGeometry(160, 160, 192, 192);
  const positions = geometry.getAttribute("position");
  // Keep the original vertex spacing around the harbor and spread the outer vertices toward the horizon.
  const extend = (coordinate: number) => {
    const outer = Math.max(0, (Math.abs(coordinate) - 32) / 48);
    return coordinate + Math.sign(coordinate) * 220 * outer ** 3;
  };
  for (let i = 0; i < positions.count; i++) {
    positions.setXY(i, extend(positions.getX(i)), extend(positions.getY(i)));
  }
  return geometry;
}

export function WaterSurface({ replay, night, wideView, cameraDepthOffset }: {
  replay: Replay; night: boolean; wideView: boolean; cameraDepthOffset: number;
}) {
  const { camera } = useThree();
  const water = useMemo(() => {
    const target = new WebGLRenderTarget(768, 768, { type: HalfFloatType, samples: 0 });
    const depth = coastalDepth();
    const reflectionMatrix = new Matrix4();
    const material = new ShaderMaterial({
      name: "HealthCityWater",
      uniforms: {
        reflectionMap: { value: target.texture },
        depthMap: { value: depth.texture },
        coastBounds: { value: depth.bounds },
        distanceRange: { value: depth.margin },
        reflectionMatrix: { value: reflectionMatrix },
        replayTime: { value: 0 },
        deepColor: { value: new Color("#286492") },
        coastalColor: { value: new Color("#499fa8") },
        shallowColor: { value: new Color("#a5dfd3") },
        foamColor: { value: new Color("#d5f1e9") },
        skyColor: { value: new Color("#c1e1dc") },
        reflectionSkyColor: { value: new Color("#b8dad3") },
        viewDirection: { value: new Vector3() },
        lightColor: { value: new Color("#fff4d5") },
        nightAmount: { value: 0 },
        wideView: { value: false },
        cameraDepthOffset: { value: cameraDepthOffset },
      },
      vertexShader,
      fragmentShader,
    });
    const surface = new Mesh(waterGeometry(), material);
    surface.name = "Harbor water";
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = WATER_LEVEL;
    const mirror = camera.clone();
    const position = new Vector3();
    const lookAt = new Vector3();
    const clip = [new Plane(new Vector3(0, 1, 0), -WATER_LEVEL)];
    const bias = new Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);

    // The cloned camera preserves the scene's orthographic projection.
    surface.onBeforeRender = (renderer, scene, activeCamera) => {
      activeCamera.getWorldPosition(position);
      activeCamera.getWorldDirection(lookAt);
      material.uniforms.viewDirection!.value.copy(lookAt).negate();
      lookAt.add(position);
      position.y = WATER_LEVEL * 2 - position.y;
      lookAt.y = WATER_LEVEL * 2 - lookAt.y;
      mirror.position.copy(position);
      mirror.up.copy(activeCamera.up);
      mirror.up.y *= -1;
      mirror.lookAt(lookAt);
      mirror.projectionMatrix.copy(activeCamera.projectionMatrix);
      mirror.projectionMatrixInverse.copy(activeCamera.projectionMatrixInverse);
      mirror.updateMatrixWorld();
      reflectionMatrix.copy(bias).multiply(mirror.projectionMatrix)
        .multiply(mirror.matrixWorldInverse).multiply(surface.matrixWorld);

      const previousTarget = renderer.getRenderTarget();
      const previousClipping = renderer.clippingPlanes;
      const previousShadows = renderer.shadowMap.autoUpdate;
      const previousXr = renderer.xr.enabled;
      surface.visible = false;
      try {
        renderer.clippingPlanes = clip;
        renderer.shadowMap.autoUpdate = false;
        renderer.xr.enabled = false;
        renderer.setRenderTarget(target);
        renderer.render(scene, mirror);
      } finally {
        renderer.setRenderTarget(previousTarget);
        renderer.clippingPlanes = previousClipping;
        renderer.shadowMap.autoUpdate = previousShadows;
        renderer.xr.enabled = previousXr;
        surface.visible = true;
      }
    };
    return { surface, material, target, depth };
  }, [camera, cameraDepthOffset]);

  useEffect(() => () => {
    water.depth.texture.dispose();
    water.target.dispose();
    water.material.dispose();
    water.surface.geometry.dispose();
  }, [water]);
  useEffect(() => {
    const uniforms = water.material.uniforms;
    uniforms.deepColor!.value.set(night ? "#264962" : "#286492");
    uniforms.coastalColor!.value.set(night ? "#2c6174" : "#499fa8");
    uniforms.shallowColor!.value.set(night ? "#72a4a3" : "#a5dfd3");
    uniforms.foamColor!.value.set(night ? "#799fa9" : "#d5f1e9");
    uniforms.skyColor!.value.set(night ? "#29454f" : "#c1e1dc");
    uniforms.reflectionSkyColor!.value.set(night ? "#29454f" : "#b8dad3");
    uniforms.nightAmount!.value = night ? 1 : 0;
  }, [night, water]);
  useFrame(() => {
    water.material.uniforms.replayTime!.value = replay.read().seconds / 190;
    water.material.uniforms.wideView!.value = wideView;
  });
  return <primitive object={water.surface} dispose={null} />;
}
