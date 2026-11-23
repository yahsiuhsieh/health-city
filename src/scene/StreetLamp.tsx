import { useEffect, useMemo } from "react";
import { Object3D } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function StreetLamp({ position, toward, night, scale = 1 }: {
  position: [number, number, number];
  toward: number;
  night: boolean;
  scale?: number;
}) {
  const { shade, target } = useMemo(() => {
    const target = new Object3D();
    target.position.set(0, 0, 2.6);
    return { target, shade: new RoundedBoxGeometry(.35, .13, .56, 1, .06) };
  }, []);
  useEffect(() => () => shade.dispose(), [shade]);
  return <group position={position} rotation-y={toward} scale={scale} name="Street lamp">
    <mesh position-y={.14} castShadow receiveShadow>
      <cylinderGeometry args={[.125, .17, .28, 10]} />
      <meshStandardMaterial color="#505a53" roughness={.78} />
    </mesh>
    <mesh position-y={1.86} castShadow>
      <cylinderGeometry args={[.047, .081, 3.44, 10]} />
      <meshStandardMaterial color="#43514c" roughness={.73} />
    </mesh>
    <mesh position={[0, 3.65, .39]} rotation-x={1.37} castShadow>
      <cylinderGeometry args={[.038, .051, .82, 10]} />
      <meshStandardMaterial color="#43514c" roughness={.73} />
    </mesh>
    <mesh geometry={shade} position={[0, 3.72, .9]} castShadow>
      <meshStandardMaterial color="#44504a" roughness={.8} />
    </mesh>
    <mesh position={[0, 3.646, .92]}>
      <boxGeometry args={[.239, .027, .395]} />
      <meshStandardMaterial color="#e0cbaa" emissive="#ffc782" emissiveIntensity={night ? 1.7 : 0} />
    </mesh>
    {night && <>
      <primitive object={target} />
      <spotLight position={[0, 3.59, .92]} target={target}
        color="#ffce90" intensity={54 * scale ** 2} distance={8 * scale} angle={.65} penumbra={.85} />
    </>}
  </group>;
}
