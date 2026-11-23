import { useEffect, useMemo, useRef } from "react";
import { useLoader } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { plotWidth, plotDepth } from "./harbor-layout.ts";
import { Color, Mesh, MeshStandardMaterial } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { HrvSkyline } from "../core/skyline.ts";
import { TOWER_SCALE, SKYLINE_PLOTS, TOWER_ASSETS, TOWER_DESIGNS, skylineDisplay } from "./skyline-layout.ts";
import type { TowerDesignId } from "./skyline-layout.ts";
import type { Group } from "three";

function TowerInstance({ model }: { model: Group }) {
  const scene = useMemo(() => model.clone(true), [model]);
  return <primitive object={scene} dispose={null} />;
}

export function SkylineDistrict({ night, hrv, focus, onReady, onSelect }: {
  night: boolean;
  hrv: HrvSkyline;
  focus: TowerDesignId | null;
  onReady: () => void;
  onSelect: (design: TowerDesignId) => void;
}) {
  const gltfs = useLoader(GLTFLoader, TOWER_ASSETS);
  const models = useMemo(() => gltfs.map(gltf => {
    const scene = gltf.scene.clone(true);
    const daytime = new Map<MeshStandardMaterial, Color>();
    scene.traverse(child => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const material = (child.material as MeshStandardMaterial).clone();
      child.material = material;
      daytime.set(material, material.color.clone());
    });
    return { scene, daytime };
  }), [gltfs]);
  useEffect(() => {
    for (const model of models) {
      model.scene.traverse(child => {
        if (!(child instanceof Mesh) || !(child.material instanceof MeshStandardMaterial)) return;
        const material = child.material;
        material.color.copy(model.daytime.get(material)!);
        material.emissive.set("#000000");
        material.emissiveIntensity = 0;
        if (night && child.name.startsWith("tower-window-lit")) {
          material.color.set("#d8b77d");
          material.emissive.set("#ffd59a");
          material.emissiveIntensity = .48;
        } else if (night && child.name.startsWith("tower-light")) {
          material.emissive.set("#ffdeaa");
          material.emissiveIntensity = .8;
        }
      });
    }
  }, [models, night]);
  useEffect(() => onReady(), [onReady]);
  useEffect(() => () => {
    for (const model of models) for (const material of model.daytime.keys()) material.dispose();
  }, [models]);
  const pointerDown = useRef<[number, number] | null>(null);
  const inspect = (event: ThreeEvent<MouseEvent>, design: TowerDesignId) => {
    event.stopPropagation();
    const down = pointerDown.current;
    if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) < 5) onSelect(design);
    pointerDown.current = null;
  };
  const display = skylineDisplay(hrv);
  const plotCount = focus ? 5 : display.plotCount;
  return <group name="HRV skyline">
    {SKYLINE_PLOTS.slice(0, plotCount).map(({ id, x, z, yaw, design }) => {
      if (focus && focus !== design.id) return null;
      const occupied = !!focus || id < display.visibleCount;
      const model = models[TOWER_DESIGNS.indexOf(design)]!;
      return <group key={id} name={occupied ? "HRV tower " + id : "HRV plot " + id} position={[x, .62, z]} rotation-y={yaw}
        onPointerDown={event => { pointerDown.current = [event.clientX, event.clientY]; }}
        onClick={event => inspect(event, design.id)}>
        <mesh position-y={-.10} receiveShadow><boxGeometry args={[plotWidth,.20,plotDepth]} /><meshStandardMaterial color="#cbbfa7" roughness={.94}/></mesh>
        {occupied ? <group scale={TOWER_SCALE}><TowerInstance model={model.scene} /></group> : hrv.status === "unavailable" && <mesh name="HRV unavailable plot" position={[0, 17.25, 0]}>
          <boxGeometry args={[8.25, 34.5, 6.75]} />
          <meshBasicMaterial wireframe transparent opacity={.28} color="#8caaa6" />
        </mesh>}
      </group>;
    })}
  </group>;
}
