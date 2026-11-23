import { useOverview } from "./city/OverviewModel.tsx";
import { useEffect, useMemo } from "react";
import { BoxGeometry, CylinderGeometry, Object3D } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const lampColor = "#ffd39a";
export const lampHead = [0, 3.65, .92] as const;

export function useLampFixture() {
  const fixture = useMemo(() => {
    const parts = [
      new CylinderGeometry(.125, .17, .28, 10).translate(0, .14, 0),
      new CylinderGeometry(.047, .081, 3.44, 10).translate(0, 1.86, 0),
      new CylinderGeometry(.038, .051, .82, 10).rotateX(1.37).translate(0, 3.65, .39),
      new RoundedBoxGeometry(.35, .13, .56, 1, .06).translate(0, 3.72, .9),
    ];
    const triangles = parts.map(part => part.index ? part.toNonIndexed() : part);
    const housing = mergeGeometries(triangles);
    for (const part of new Set([...parts, ...triangles])) part.dispose();
    const lens = new BoxGeometry(.29, .055, .46).translate(...lampHead);
    return { housing, lens };
  }, []);
  useEffect(() => () => { fixture.housing.dispose(); fixture.lens.dispose(); }, [fixture]);
  return fixture;
}

export function StreetLamp({ position, toward, night, scale = 1 }: {
  position: [number, number, number];
  toward: number;
  night: boolean;
  scale?: number;
}) {
  const overview=useOverview();
  const { housing, lens } = useLampFixture();
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.set(0, 0, 2.6);
    return object;
  }, []);
  return <group position={position} rotation-y={toward} scale={scale} name="Street lamp">
    <mesh geometry={housing} castShadow receiveShadow>
      <meshStandardMaterial color="#43514c" roughness={.76} />
    </mesh>
    <mesh geometry={lens}>
      <meshStandardMaterial color="#e0cbaa" emissive={lampColor} emissiveIntensity={night ? 1.7 : 0} />
    </mesh>
    {night && !overview && <>
      <primitive object={target} />
      <spotLight position={[0, 3.59, .92]} target={target}
        color="#ffce90" intensity={54 * scale ** 2} distance={8 * scale} angle={.65} penumbra={.85} />
    </>}
  </group>;
}
