import { cityLight } from "./city/palette.ts";
import { useEffect, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferGeometry, Color, Group, DepthTexture, RGBFormat, UnsignedInt101111Type, Mesh, NearestFilter, PlaneGeometry,
  MeshBasicMaterial, ShaderMaterial, UnsignedIntType, Vector2, Vector3, WebGLRenderTarget,
} from "three";
import { CAMERA_DEPTH_OFFSET } from "./camera-depth.ts";
import { absorptionRates, shelfFade } from "./ocean/absorption.ts";
import { shoreGLSL } from "./ocean/shore-shader.ts";
import { useOcean } from "./ocean/OceanEnvironment.tsx";
import { DRY_LAYER, SEABED_LAYER, TRANSPARENT_LAYER, WATER_LEVEL } from "./ocean/layers.ts";

const vertexShader = /* glsl */`
  varying vec3 worldPoint;
  varying float surfaceZ;
  void main() {
    worldPoint = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 viewPoint = modelViewMatrix * vec4(position, 1.0);
    surfaceZ = viewPoint.z;
    gl_Position = projectionMatrix * viewPoint;
  }
`;

const fragmentShader = /* glsl */`
  #include <common>
  #include <packing>
  uniform sampler2D islandMap,outerMap;
  uniform vec4 outerBounds;
  uniform vec4 islandBounds;
  uniform sampler2D sceneColor;
  uniform sampler2D sceneDepth;
  uniform vec2 resolution;
  uniform vec2 texel;
  uniform vec2 clipRange;
  uniform vec3 viewDirection;
  uniform vec3 deepColor;
  uniform vec3 shallowTint;
  uniform float nightAmount;
  uniform float oceanTime, reveal,uIslandReveal;
  uniform vec3 skyColor, foamColor, fleckColor, harborTint;
  uniform sampler2D bedMap;
  uniform vec4 bedBounds;
  ${shoreGLSL}

  float flecks(vec2 p) {
    vec2 drift=p-vec2(.78,.63)*.08*oceanTime;
    vec2 cell=floor(drift/2.6);
    vec4 seed=noiseSamples(cell);
    vec2 local=(fract(drift/2.6)-.5)*2.6+(seed.gb-.5)*1.1;
    float radius=mix(.15,.6,seed.r);
    local.y+=local.x*(seed.b-.5)*1.4;
    float edge=length(local*vec2(1.,2.2))/radius;
    float life=smoothstep(.24,.82,.5+.5*sin(oceanTime*.77+seed.a*28.));
    return (1.-smoothstep(.12,1.,edge))*life*smoothstep(.56,.84,seed.g)*(.18+.5*lace(drift));

  }
  varying vec3 worldPoint;
  varying float surfaceZ;

  float viewZ(vec2 uv) {
    return orthographicDepthToViewZ(texture2D(sceneDepth, uv).r, clipRange.x, clipRange.y);
  }
  void selectBehind(vec2 tap, inout vec2 bestUV, inout float bestZ) {
    float z = viewZ(tap);
    if (z <= surfaceZ && z > bestZ) {
      bestUV = tap;
      bestZ = z;
    }
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 sampleUV = uv;
    float z = -clipRange.y;
    selectBehind(uv, sampleUV, z);
    selectBehind(uv + vec2(texel.x, 0), sampleUV, z);
    selectBehind(uv + vec2(0, texel.y), sampleUV, z);
    float depth = z <= -clipRange.y + .001 ? 40.0 : (surfaceZ - z) * viewDirection.y;
    vec2 p = worldPoint.xz;
    vec2 small = p/1.5 + vec2(.07,-.04)*oceanTime;
    vec2 large = p/4. - vec2(.02,.05)*oceanTime;
    vec2 fineRipple=noiseSamples(small).rg;
    vec2 slope=.04*(fineRipple+noiseSamples(large).rb-1.);
    vec4 bank = vec4(1.,1.,0.,0.);
    if (all(greaterThanEqual(p,bedBounds.xy)) && all(lessThan(p,bedBounds.xy+bedBounds.zw)))
      bank = texture2D(bedMap,(p-bedBounds.xy)/bedBounds.zw);
    bool fixedReef=false;
    if(all(greaterThanEqual(p,outerBounds.xy)) && all(lessThan(p,outerBounds.xy+outerBounds.zw))){
      vec4 reef=texture2D(outerMap,(p-outerBounds.xy)/outerBounds.zw);
      if(reef.r<bank.r){bank=reef;fixedReef=true;}
    }
    if(uIslandReveal>0. && all(greaterThanEqual(p,islandBounds.xy)) && all(lessThan(p,islandBounds.xy+islandBounds.zw))){
      vec4 island=texture2D(islandMap,(p-islandBounds.xy)/islandBounds.zw);
      if(island.r<bank.r){bank=island;fixedReef=false;}
    }
    if(bank.b>.97) depth=max(depth,40.*bank.r*smoothstep(2.5,9.,40.*bank.r));
    float cover=bank.b<=0.?1.:bank.b>.97?uIslandReveal:smoothstep(bank.b-.045,bank.b+.008,reveal);
    vec3 water=deepColor;
    if (depth < ${shelfFade[1]}) {
      vec2 offsetUV=sampleUV+slope*.012*smoothstep(0.,1.5,depth);
      if (viewZ(offsetUV)<=surfaceZ) sampleUV=offsetUV;
      vec3 refracted=texture2D(sceneColor,sampleUV).rgb;
      float bedVisibility=1.-smoothstep(${shelfFade.join(",")},depth);
      vec3 transmittance=exp(-depth*vec3(${absorptionRates.join(",")}));
      water=mix(deepColor,refracted,transmittance*bedVisibility);
      float tint=smoothstep(.3,1.2,depth)*(1.-smoothstep(2.5,6.,depth));
      // A shallow animal in offshore water does not acquire the sand shelf tint.
      float shelf=1.-smoothstep(8.,12.,40.*bank.r);
      water=mix(water,mix(deepColor,shallowTint,shelf),tint*mix(.16,.35,shelf)*(1.-.5*nightAmount));
    }
    float basin = clamp(-bank.b,0.,1.);
    vec3 portWater=mix(deepColor,harborTint,.32*(1.-.5*nightAmount));
    water=mix(water,portWater,basin*smoothstep(1.6,2.5,depth));
    water=mix(deepColor,water,cover);
    depth=mix(40.,depth,cover);
    float broad = oceanNoise((p+vec2(.02,0)*oceanTime)/40.) + oceanNoise((p-vec2(0,.02)*oceanTime)/90.)-1.;
    water *= 1.+.035*broad;
    vec3 normal = normalize(vec3(slope.x,1.,slope.y));
    float fresnel = pow(1.-max(dot(normal,viewDirection),0.),3.);
    water = mix(water,skyColor,.06*fresnel);
    float sun = max(dot(reflect(-viewDirection,normal),normalize(vec3(.57,1.,.52))),0.);
    water += vec3(1.,.93,.78)*(.04*pow(sun,60.)*fineRipple.r*(1.-.9*nightAmount));
    if (depth>3.) {
      float fleckAlpha=flecks(p)*smoothstep(3.,5.,depth)*mix(.225,.125,nightAmount);
      water=mix(water,fleckColor,fleckAlpha);
    }
    float distance = bank.g*24.;
    if (abs(distance) < 2.5 && (bank.b>.97?uIslandReveal>0.:bank.b<=reveal)) {
      vec2 wash = shoreWash(p,distance,oceanTime);
      float soft = wash.x*(1.-smoothstep(1.3,3.,depth))*mix(.85,.5,nightAmount);
      float contact = (1.-smoothstep(.05,.15,abs(distance)))*.25;
      float rockFoam = .4 * (1.-smoothstep(.04,.3,abs(distance)))*lace(p);
      float foam = bank.a > 1.5 ? rockFoam : mix(soft,contact,min(bank.a,1.));
      water = mix(water,foamColor,foam*(bank.b>.97?uIslandReveal:1.));
    }
    if((bank.b>.97 || fixedReef) && bank.a>.01){
      vec2 crestWash=shoreWash(p,(1.-bank.a/3.)*1.6,oceanTime);
      float surf=bank.a/3.*(.18+.82*crestWash.x)*(.2+.8*lace(p));
      water=mix(water,foamColor,surf*(fixedReef?1.:uIslandReveal));
    }
    float farDepth = -surfaceZ - ${CAMERA_DEPTH_OFFSET.toFixed(1)};
    float softBeach = (1.-smoothstep(0.,1.,bank.a))*(bank.b>.97?uIslandReveal:step(bank.b,reveal));
    float horizon = smoothstep(165.,275.,farDepth)*mix(1.,smoothstep(2.,12.,distance),softBeach);
    gl_FragColor = vec4(water, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    vec3 horizonColor = mix(linearToOutputTexel(vec4(deepColor,1.)).rgb,
                            linearToOutputTexel(vec4(skyColor,1.)).rgb,.4);
    gl_FragColor.rgb = mix(gl_FragColor.rgb,horizonColor,horizon);
  }
`;

export function WaterSurface({ night, dryLand }: { night: boolean; dryLand: RefObject<Group | null> }) {
  const ocean = useOcean();
  const camera = useThree(state => state.camera);
  const water = useMemo(() => {
    const oceanTarget = new WebGLRenderTarget(1, 1, {
      format: RGBFormat, type: UnsignedInt101111Type, minFilter: NearestFilter, magFilter: NearestFilter,
      depthTexture: new DepthTexture(1, 1, UnsignedIntType),
    });
    const uniforms = {
      sceneColor: { value: oceanTarget.texture }, sceneDepth: { value: oceanTarget.depthTexture },
      resolution: { value: new Vector2() }, texel: { value: new Vector2() },
      clipRange: { value: new Vector2() }, viewDirection: { value: new Vector3() },
      deepColor: { value: new Color() }, shallowTint: { value: new Color() },
      skyColor: {value: new Color()}, foamColor: {value: new Color()}, fleckColor: {value: new Color()},
      harborTint: {value: new Color("#1d6a86")}, ...ocean.uniforms,
    };
    const material = new ShaderMaterial({ name: "Ocean refraction", uniforms, vertexShader, fragmentShader });
    const surface = new Mesh(new PlaneGeometry(1000, 1000), material);
    surface.name = "Ocean";
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = WATER_LEVEL;
    // Run after shadow updates and before the main scene draws its opaque meshes.
    const prepass = new Mesh(new BufferGeometry(),new MeshBasicMaterial());
    prepass.name = "Ocean refraction pre-pass";
    prepass.frustumCulled = false;
    prepass.geometry.setDrawRange(0,0);
    prepass.renderOrder = -1000;
    surface.renderOrder = 1;
    prepass.onBeforeRender = (renderer, scene, activeCamera) => {
      renderer.getDrawingBufferSize(uniforms.resolution.value);
      const { x, y } = uniforms.resolution.value;
      const w = Math.max(1, Math.round(x * .75)), h = Math.max(1, Math.round(y * .75));
      oceanTarget.setSize(w, h);
      uniforms.texel.value.set(1 / w, 1 / h);
      activeCamera.getWorldDirection(uniforms.viewDirection.value).negate();
      uniforms.clipRange.value.set(camera.near, camera.far);
      const target = renderer.getRenderTarget();
      const mask = activeCamera.layers.mask;
      const shadows = renderer.shadowMap.autoUpdate;
      const xr = renderer.xr.enabled;
      const inland = dryLand.current;
      const updateMatrices = scene.matrixWorldAutoUpdate;
      const showInland = inland?.visible ?? false;
      if (inland) inland.visible=false;
      prepass.visible=false;
      surface.visible = false;
      try {
        scene.matrixWorldAutoUpdate=false;
        activeCamera.layers.disable(TRANSPARENT_LAYER);
        activeCamera.layers.disable(DRY_LAYER);
        activeCamera.layers.enable(SEABED_LAYER);
        ocean.waterPass.value=1;
        renderer.shadowMap.autoUpdate = false;
        renderer.xr.enabled = false;
        renderer.setRenderTarget(oceanTarget);
        renderer.render(scene, activeCamera);
      } finally {
        ocean.waterPass.value=0;
        renderer.setRenderTarget(target);
        activeCamera.layers.mask = mask;
        renderer.shadowMap.autoUpdate = shadows;
        renderer.xr.enabled = xr;
        scene.matrixWorldAutoUpdate=updateMatrices;
        if (inland) inland.visible=showInland;
        prepass.visible=true;
        surface.visible = true;
      }
    };
    return { oceanTarget, uniforms, surface, prepass, direction:new Vector3() };
  }, [camera,ocean,dryLand]);
  useFrame(() => {
    if (!("isOrthographicCamera" in camera)) return;
    const direction = camera.getWorldDirection(water.direction);
    const travel = (WATER_LEVEL-camera.position.y)/direction.y;
    const period = 256;
    water.surface.position.x = period*Math.round((camera.position.x+direction.x*travel)/period);
    water.surface.position.z = period*Math.round((camera.position.z+direction.z*travel)/period);
    const width = (camera.right-camera.left)/camera.zoom;
    const height = (camera.top-camera.bottom)/(camera.zoom*Math.abs(direction.y));
    water.surface.scale.setScalar(Math.max(1,(Math.hypot(width,height)+period*2)/1000));
  });
  useEffect(() => {
    camera.layers.enable(DRY_LAYER);
    camera.layers.enable(TRANSPARENT_LAYER);
    return () => { camera.layers.disable(TRANSPARENT_LAYER); camera.layers.disable(DRY_LAYER); };
  }, [camera]);
  useEffect(() => () => {
    water.prepass.geometry.dispose();
    water.prepass.material.dispose();
    water.oceanTarget.dispose();
    water.surface.material.dispose();
    water.surface.geometry.dispose();
  }, [water]);
  useEffect(() => {
    water.uniforms.skyColor.value.set(night ? cityLight.night.air : cityLight.day.air);
    water.uniforms.foamColor.value.set(night ? "#9bb7bd" : "#f4fbf8");
    water.uniforms.fleckColor.value.set(night ? "#7f99a6" : "#e3f0f4");
    water.uniforms.deepColor.value.set(night ? "#0e2f55" : "#195b85");
    water.uniforms.shallowTint.value.set(night ? "#2f7f86" : "#5fd0c0");
  }, [night, water]);
  return <><primitive object={water.prepass} dispose={null}/><primitive object={water.surface} dispose={null}/></>;
}
