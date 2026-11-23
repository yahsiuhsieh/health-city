import { useEffect, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { trafficAt } from "../core/representative-day.ts";
import type { ReplayDay } from "../core/representative-day.ts";
import type { Replay } from "../core/replay.ts";
import { ROAD_Y, vehicleRoutes } from "./harbor-layout.ts";
import type { DistrictMotion } from "./district-motion.ts";
import { dailyModelOrder } from "./seeded-order.ts";
import { createVehicleRig } from "./vehicle-rig.ts";

const VEHICLE_ASSETS = ["van", "saloon", "hatchback", "pickup"].map(name => "/models/vehicle-" + name + ".glb");
export function HarborRoad({ day, replay, motion, night, onReady }: {
  day: ReplayDay;
  replay: Replay;
  motion: DistrictMotion;
  night: boolean;
  onReady: () => void;
}) {
  const gltfs = useLoader(GLTFLoader, VEHICLE_ASSETS);
  const cars = useMemo(() => {
    const order = dailyModelOrder(gltfs, "harbor-road", day.date);
    return order.map((gltf, index) => {
      const rig = createVehicleRig(gltf.scene);
      rig.model.visible = false;
      return { ...rig, route: vehicleRoutes[index]! };
    });
  }, [day.date, gltfs]);

  useEffect(() => onReady(), [onReady]);
  useEffect(() => () => {
    for (const car of cars) car.dispose();
  }, [cars]);
  useEffect(() => {
    for (const car of cars) car.setNight(night);
  }, [cars, night]);

  useFrame(() => {
    const { seconds } = replay.read();
    const { vehicleCount } = trafficAt(day, seconds);
    for (const [index, car] of cars.entries()) {
      car.model.visible = index < vehicleCount;
      if (!car.model.visible) continue;
      const roadPath = car.route;
      const metres = motion.driveDistance(index, seconds);
      const pose = roadPath.at(metres);
      car.model.position.set(pose.x, ROAD_Y, pose.z);
      car.model.rotation.y = pose.yaw;
      const sample = 1.45;
      const headingChange = roadPath.at(metres + sample).yaw - roadPath.at(metres - sample).yaw;
      const curvature = Math.atan2(Math.sin(headingChange), Math.cos(headingChange)) / (2 * sample);
      car.poseWheels(metres, curvature);
    }
  });

  return <group name="Harbor road">
    {cars.map(({ model }) => <primitive key={model.uuid} object={model} dispose={null} />)}
  </group>;
}
