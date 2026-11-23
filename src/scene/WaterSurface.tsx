import { cityLight } from "./city/palette.ts";
import { useEffect, useMemo, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
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
  uniform sampler2D sleepZones;
  uniform vec4 sleepBounds;
  uniform bool hasSleepZones;
  uniform sampler2D sceneColor;
  uniform sampler2D sceneDepth;
  uniform vec2 resolution;
  uniform vec2 texel;
  uniform vec2 clipRange;
  uniform vec3 viewDirection;
  uniform vec3 deepColor;
  uniform vec3 shallowTint;
  uniform float nightAmount;
  uniform float oceanTime, reveal;
  uniform vec3 skyColor, foamColor, fleckColor, harborTint;
  uniform sampler2D bedMap;
  uniform vec4 bedBounds;
  ${shoreGLSL}

  float flecks(vec2 p) {
    vec2 drift = p - vec2(.78,.63)*.08*oceanTime;
    vec2 warp = noiseSamples(drift*.19).ra-.5;
    vec2 q = (drift + 3.*warp) / 2.8;
    float n = .63*oceanNoise(q)+.26*oceanNoise(q*2.13+11.)+.11*oceanNoise(q*4.27);
    float life = sin(6.2831853*oceanTime/8.+6.*oceanNoise(drift*.33));
    float fleck = smoothstep(.78,.86,n + .05*life + .13*(oceanNoise(drift*.061)-.5));
    return fleck > 0. ? fleck*(.16+.52*lace(drift)) : 0.;
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
    vec3 stages=vec3(0.);
    float passage=1.;
    if(hasSleepZones){
      vec4 zone=texture2D(sleepZones,(p-sleepBounds.xy)/sleepBounds.zw);
      stages=zone.rgb*smoothstep(zone.a-.015,zone.a,reveal);
      slope*=1.-.7*stages.g;
      if(zone.a>.001) passage=smoothstep(zone.a-.018,zone.a+.024,reveal);
    }
    vec3 water=deepColor;
    if (depth < ${shelfFade[1]}) {
      vec2 offsetUV=sampleUV+slope*.012*smoothstep(0.,1.5,depth);
      if (viewZ(offsetUV)<=surfaceZ) sampleUV=offsetUV;
      vec3 refracted=texture2D(sceneColor,sampleUV).rgb;
      float bedVisibility=1.-smoothstep(${shelfFade.join(",")},depth);
      vec3 transmittance=exp(-depth*vec3(${absorptionRates.join(",")}));
      water=mix(deepColor,refracted,transmittance*bedVisibility);
      float tint=smoothstep(.3,1.2,depth)*(1.-smoothstep(2.5,6.,depth));
      water=mix(water,shallowTint,tint*.35*(1.-.5*nightAmount));
    }
    vec4 bank = texture2D(bedMap,(p-bedBounds.xy)/bedBounds.zw);
    float basin = (1.-smoothstep(24.,33.,p.x)) * smoothstep(-20.,-8.,p.x)
      * (1.-smoothstep(70.,82.,abs(p.y+1.)));
    water = mix(water,harborTint,.25*basin*smoothstep(2.,6.,depth));
    water=mix(water,mix(vec3(.065,.37,.31),vec3(.018,.105,.105),nightAmount),.17*stages.r);
    water=mix(water,mix(vec3(.019,.125,.13),vec3(.009,.045,.051),nightAmount),.62*stages.g);
    water=mix(water,mix(vec3(.014,.44,.44),vec3(.013,.115,.16),nightAmount),.21*stages.b);
    float broad = oceanNoise((p+vec2(.02,0)*oceanTime)/40.) + oceanNoise((p-vec2(0,.02)*oceanTime)/90.)-1.;
    water *= 1.+.035*broad;
    vec3 normal = normalize(vec3(slope.x,1.,slope.y));
    float fresnel = pow(1.-max(dot(normal,viewDirection),0.),3.);
    water = mix(water,skyColor,.06*fresnel);
    float sun = max(dot(reflect(-viewDirection,normal),normalize(vec3(.57,1.,.52))),0.);
    water += vec3(1.,.93,.78)*(.04*pow(sun,60.)*fineRipple.r*(1.-.9*nightAmount));
    if (depth>3.) {
      float fleckAlpha=flecks(p)*smoothstep(3.,5.,depth)*mix(.45,.25,nightAmount);
      fleckAlpha*=1.-.8*stages.g;
      water=mix(water,fleckColor,fleckAlpha);
    }
    float distance = bank.g*24.;
    if (abs(distance) < 2.5 && bank.b <= reveal) {
      vec2 wash = shoreWash(p,distance,oceanTime);
      float soft = wash.x*(1.-smoothstep(1.3,3.,depth))*mix(.85,.5,nightAmount);
      float contact = (1.-smoothstep(.05,.15,abs(distance)))*.25;
      float rockFoam = .4 * (1.-smoothstep(.04,.3,abs(distance)))*lace(p);
      float foam = bank.a > 1.5 ? rockFoam : mix(soft,contact,min(bank.a,1.));
      water = mix(water,foamColor,foam);
    }
    float farDepth = -surfaceZ - ${CAMERA_DEPTH_OFFSET.toFixed(1)};
    float softBeach = (1.-smoothstep(0.,1.,bank.a))*step(bank.b,reveal);
    float horizon = smoothstep(165.,275.,farDepth)*mix(1.,smoothstep(2.,12.,distance),softBeach);
    if(bank.b>0.)water=mix(deepColor,water,passage);
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
        renderer.shadowMap.autoUpdate = false;
        renderer.xr.enabled = false;
        renderer.setRenderTarget(oceanTarget);
        renderer.render(scene, activeCamera);
      } finally {
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
    return { oceanTarget, uniforms, surface, prepass };
  }, [camera,ocean,dryLand]);
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
