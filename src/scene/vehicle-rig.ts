import {
  AdditiveBlending, CylinderGeometry, DoubleSide, Group, Mesh, MeshStandardMaterial,
  Object3D, ShaderMaterial, SpotLight, Vector3,
} from "three";

const WHEEL_RADIUS = .34;
const BEAM_LENGTH = 5.2;

// The soft cone makes the direction visible. The spotlight illuminates the road.
const beamVertex = /* glsl */`
  varying float progress;
  varying float facing;
  void main() {
    progress = 1.0 - uv.y;
    facing = abs(normalize(normalMatrix * normal).z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const beamFragment = /* glsl */`
  varying float progress;
  varying float facing;
  void main() {
    float fade = smoothstep(0.0, .07, progress) * pow(1.0 - progress, 1.55);
    float opacity = fade * smoothstep(.10, .83, facing) * .21;
    gl_FragColor = vec4(1.0, .82, .53, opacity);
    #include <colorspace_fragment>
  }
`;

export function createVehicleRig(source: Group) {
  const model = source.clone(true);
  const wheels: Object3D[] = [];
  const lamps = new Map<string, MeshStandardMaterial>();
  const emitters: Vector3[] = [];
  model.updateMatrixWorld(true);
  model.traverse(item => {
    // GLTFLoader can load a wheel pivot as a plain Object3D.
    if (item.name.startsWith("wheel-")) wheels.push(item);
    if (!(item instanceof Mesh) || !(item.material instanceof MeshStandardMaterial)) return;
    item.castShadow = true;
    item.receiveShadow = true;
    const name = item.material.name;
    if (name !== "headlight" && name !== "taillight") return;
    if (!lamps.has(name)) lamps.set(name, item.material.clone());
    item.material = lamps.get(name)!;
    if (name === "headlight") emitters.push(model.worldToLocal(item.getWorldPosition(new Vector3())));
  });

  const headlights = new Group();
  headlights.name = "Headlight beams";
  headlights.visible = false;
  const beamGeometry = new CylinderGeometry(.065, .82, BEAM_LENGTH, 16, 1, true);
  const beamMaterial = new ShaderMaterial({
    vertexShader: beamVertex,
    fragmentShader: beamFragment,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    forceSinglePass: true,
  });
  const beams: SpotLight[] = [];
  for (const emitter of emitters) {
    emitter.z += .06;
    const aim = new Vector3(emitter.x * .92, .08, emitter.z + BEAM_LENGTH);
    const direction = aim.clone().sub(emitter).normalize();
    const lamp = new SpotLight("#ffe4af", 29, 9, .3, .71, 2);
    lamp.position.copy(emitter);
    lamp.target.position.copy(aim);
    headlights.add(lamp, lamp.target);
    beams.push(lamp);

    const beam = new Mesh(beamGeometry, beamMaterial);
    beam.position.copy(emitter).addScaledVector(direction, BEAM_LENGTH / 2);
    beam.quaternion.setFromUnitVectors(new Vector3(0, -1, 0), direction);
    headlights.add(beam);
  }
  model.add(headlights);
  const front = wheels.filter(wheel => wheel.position.z > 0);
  const wheelbase = Math.max(...wheels.map(wheel => wheel.position.z)) - Math.min(...wheels.map(wheel => wheel.position.z));
  for (const wheel of front) wheel.rotation.order = "YXZ";

  return {
    model,
    poseWheels(metres: number, curvature: number) {
      const angle = metres / WHEEL_RADIUS % (2 * Math.PI);
      for (const wheel of wheels) wheel.rotation.x = angle;
      for (const wheel of front) {
        // The inner wheel needs a sharper angle than the outer wheel.
        wheel.rotation.y = Math.atan2(wheelbase * curvature, 1 - wheel.position.x * curvature);
      }
    },
    setNight(night: boolean) {
      headlights.visible = night;
      for (const [name, lamp] of lamps) {
        lamp.emissive.set(name === "headlight" ? "#ffe4a9" : "#e95436");
        lamp.emissiveIntensity = night ? .95 : 0;
      }
    },
    dispose() {
      beamGeometry.dispose();
      beamMaterial.dispose();
      for (const light of beams) light.dispose();
      for (const lamp of lamps.values()) lamp.dispose();
    },
  };
}
