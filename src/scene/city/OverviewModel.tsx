import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BatchedMesh, BufferGeometry, Float32BufferAttribute, Object3D, InstancedMesh, Matrix4,
  Mesh, MeshStandardMaterial, OrthographicCamera, Light, Vector3,
} from "three";

const Overview = createContext(false);
export const useOverview = () => useContext(Overview);

export function OverviewDetail({ world, children }: { world: boolean; children: ReactNode }) {
  const [distant, setDistant] = useState(false);
  const last = useRef(false);
  useFrame(({ camera }) => {
    const wide = world && camera instanceof OrthographicCamera && (camera.top-camera.bottom)/camera.zoom > 120;
    if (last.current === wide) return;
    last.current = wide;
    setDistant(wide);
  });
  return <Overview.Provider value={world && distant}>{children}</Overview.Provider>;
}

type Part = Mesh<BufferGeometry, MeshStandardMaterial>;
type Piece = { mesh: Part; floor: number; slot: number };

// BatchedMesh requires the same attributes and index convention on each geometry.
function batchGeometry(source: BufferGeometry, vertexColors: boolean) {
  const geometry = new BufferGeometry();
  const positions = source.getAttribute("position");
  geometry.setAttribute("position", positions);
  geometry.setAttribute("normal", source.getAttribute("normal"));
  if (vertexColors) {
    const color = source.getAttribute("color");
    const rgb = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) rgb.set([color.getX(i), color.getY(i), color.getZ(i)], i*3);
    geometry.setAttribute("color", new Float32BufferAttribute(rgb, 3));
  }
  geometry.setIndex(source.index ?? Array.from({ length: positions.count }, (_, i) => i));
  return geometry;
}

function batchParts(parts: Part[], model: Object3D, animated: boolean, frame: { current: number }) {
  const reference = parts[0]!;
  const geometryIds = new Map<BufferGeometry, number>();
  const sources = [...new Set(parts.map(p => p.geometry))];
  const geometries = sources.map(g => batchGeometry(g, reference.material.vertexColors && !!g.getAttribute("color")));
  const count = parts.reduce((n, p) => n + (p instanceof InstancedMesh ? p.count : 1), 0);
  const material = reference.material.clone();
  const sharedColor = parts.every(part => part.material === reference.material);
  if (!sharedColor) material.color.setHex(0xffffff);
  const batch = new BatchedMesh(count,
    geometries.reduce((n, g) => n + g.getAttribute("position").count, 0),
    geometries.reduce((n, g) => n + g.index!.count, 0), material);
  geometries.forEach((g, i) => { geometryIds.set(sources[i]!, batch.addGeometry(g)); g.dispose(); });
  batch.layers.mask = reference.layers.mask;
  batch.castShadow = reference.castShadow;
  batch.receiveShadow = reference.receiveShadow;
  batch.frustumCulled = false;
  batch.perObjectFrustumCulled = false;
  batch.sortObjects = material.transparent;
  const pieces: Piece[] = [];
  for (const mesh of parts) {
    const instances = mesh instanceof InstancedMesh ? mesh.count : 1;
    for (let floor = 0; floor < instances; floor++) {
      const slot = batch.addInstance(geometryIds.get(mesh.geometry)!);
      if (!sharedColor) batch.setColorAt(slot, mesh.material.color);
      pieces.push({ mesh, floor, slot });
    }
  }
  const inverse = new Matrix4(), transform = new Matrix4(), instance = new Matrix4();
  function sync() {
    inverse.copy(model.matrixWorld).invert();
    for (const { mesh, floor, slot } of pieces) {
      transform.multiplyMatrices(inverse, mesh.matrixWorld);
      if (mesh instanceof InstancedMesh) {
        mesh.getMatrixAt(floor, instance);
        transform.multiply(instance);
      }
      batch.setMatrixAt(slot, transform);
    }
  }
  sync();
  let lastFrame = -1;
  const draw = batch.onBeforeRender.bind(batch);
  batch.onBeforeRender = (...args) => {
    if (lastFrame !== frame.current) {
      if (animated) sync();
      if (sharedColor) material.color.copy(reference.material.color);
      material.emissive.copy(reference.material.emissive);
      material.emissiveIntensity = reference.material.emissiveIntensity;
      lastFrame = frame.current;
    }
    draw(...args);
  };
  return batch;
}

// Keep animated pivots and material updates on the original model. Batch its opaque parts at city scale.
export function OverviewModel({ model, animated = false, omitSmall = false }: {
  model: Object3D; animated?: boolean; omitSmall?: boolean;
}) {
  const overview = useOverview();
  const frame = useRef(0);
  useFrame(() => { frame.current++; });
  useLayoutEffect(() => {
    if (!overview) return;
    model.updateWorldMatrix(true, true);
    const groups = new Map<string, Part[]>(), layers = new Map<Mesh, number>();
    const lights: Light[] = [];
    const size = new Vector3();
    model.traverse(object => {
      if (object instanceof Light && object.visible) lights.push(object);
      if (!(object instanceof Mesh) || !(object.material instanceof MeshStandardMaterial)) return;
      // These fittings change visibility independently during a voyage.
      if(object.parent?.name.startsWith("light-") || /^(?:anchor-ball|bow-anchor)/.test(object.name) || object.parent?.name==="bow-anchor")return;
      const m = object.material;
      const window=object.name.startsWith("cabin-window");
      if ((m.transparent && !window) || m.map || !object.geometry.hasAttribute("normal")) return;
      layers.set(object, object.layers.mask);
      if (omitSmall && !/lamp|light|window|cabin-shutter/i.test(object.name)) {
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        const box = object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld);
        if (box.getSize(size).length() < 1) return;
      }
      const emissive = /window|lamp|light/i.test(object.name+" "+m.name) || m.emissive.getHex() !== 0;
      const key = [object.layers.mask, object.castShadow, object.receiveShadow, m.side,
        m.vertexColors && object.geometry.hasAttribute("color"), emissive ? m.uuid : "", object.name.startsWith("cabin-shutter")?"shutter":""].join("/");
      const group = groups.get(key) ?? [];
      group.push(object as Part);
      groups.set(key, group);
    });
    const batches = [...groups.values()].map(parts => batchParts(parts, model, animated||parts[0]!.name.startsWith("cabin-shutter"), frame));
    for (const light of lights) light.visible = false;
    for (const mesh of layers.keys()) mesh.layers.mask = 0;
    for (const batch of batches) model.add(batch);
    return () => {
      for (const light of lights) light.visible = true;
      for (const [mesh, mask] of layers) mesh.layers.mask = mask;
      for (const batch of batches) {
        model.remove(batch);
        batch.dispose();
        (batch.material as MeshStandardMaterial).dispose();
      }
    };
  }, [model, overview, animated, omitSmall]);
  return <primitive object={model} dispose={null}/>;
}
