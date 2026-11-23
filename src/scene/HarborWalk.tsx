import { useEffect, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Replay } from "../core/replay.ts";
import { stepsAt } from "../core/representative-day.ts";
import type { ReplayDay } from "../core/representative-day.ts";
import { walkerStyles } from "./district-motion.ts";
import type { DistrictMotion } from "./district-motion.ts";
import { groundHeight } from "./harbor-layout.ts";
import { ankleOffset, createLegSolver, footfall, hipDrop } from "./walk-gait.ts";
import { angleDifference } from "./walk-route.ts";

const PEDESTRIAN_ASSETS = walkerStyles.map(style => "/models/" + style.asset + ".glb");

export function HarborWalk({ day, replay, motion, onReady }: {
  day: ReplayDay;
  motion: DistrictMotion;
  replay: Replay;
  onReady: () => void;
}) {
  const gltfs = useLoader(GLTFLoader, PEDESTRIAN_ASSETS);
  const { solveLeg, targets } = useMemo(() => ({
    solveLeg: createLegSolver(), targets: [new Vector3(), new Vector3()],
  }), []);
  const figures = useMemo(() => {
    return motion.walkers.map(({route,style}) => {
      const gltf = gltfs[walkerStyles.indexOf(style)]!;
      const model = gltf.scene.clone(true);
      model.visible = false;
      model.traverse(item => { if (item instanceof Mesh) item.castShadow = true; });
      const limbs = ["left", "right"].map(side => ({
        thigh: model.getObjectByName(side + "-thigh")!,
        knee: model.getObjectByName(side + "-knee")!,
        ankle: model.getObjectByName(side + "-ankle")!,
        shoulder: model.getObjectByName(side + "-shoulder")!,
        elbow: model.getObjectByName(side + "-elbow")!,
      }));
      const body = limbs[0]!.thigh.parent!;
      return {
        model, limbs, body, scale: body.getWorldScale(new Vector3()), style,
        torso: model.getObjectByName("upper-body")!,
        head: model.getObjectByName("head")!,
        route,
      };
    });
  }, [motion, gltfs]);

  useEffect(() => onReady(), [onReady]);

  useFrame(() => {
    const { seconds } = replay.read();
    const beforeTime = Math.max(0, seconds - 10);
    const afterTime = Math.min(day.durationSeconds, seconds + 10);
    const { pedestrianCount } = stepsAt(day, seconds);
    for (const [index, figure] of figures.entries()) {
      const { model, route: walkPath, limbs, body, scale, torso, head, style } = figure;
      model.visible = index < pedestrianCount;
      if (!model.visible) continue;
      const distance = motion.walkDistance(index,seconds);
      const rhythm = distance*.8 + index;
      const moving = Math.min(1,(motion.walkDistance(index,afterTime)-motion.walkDistance(index,beforeTime))
        /(style.speed * (afterTime-beforeTime)));
      const pose = walkPath.at(distance);
      const ahead = walkPath.at(distance + .26);
      const behind = walkPath.at(distance - .26);
      const heading = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
      const turn = angleDifference(behind.yaw, ahead.yaw);
      const cycle = distance * 2 * Math.PI / style.strideLength;
      const transfer = Math.sin(cycle - .23);
      const sway = -.024 * transfer * scale.x * moving;
      const rise = -.027 + .018 * transfer ** 2;
      model.position.set(
        pose.x + sway * Math.cos(heading),
        groundHeight(pose.x,pose.z) + rise * scale.y * moving,
        pose.z - sway * Math.sin(heading),
      );
      model.rotation.y = heading;
      body.updateWorldMatrix(true, false);

      const contacts = limbs.map((limb, side) => {
        const foot = footfall(distance, style.strideLength, side * .5);
        const from = walkPath.at(distance + (foot.from-distance)*moving);
        const to = foot.blend > 0 ? walkPath.at(distance + (foot.to-distance)*moving) : from;
        const sideSign = side === 0 ? -1 : 1;
        const lateral = limb.thigh.position.x * scale.x + sideSign * .013;
        const toeOut = sideSign * (.05 + .027 * Math.sin(foot.from * .83));
        const nextToeOut = sideSign * (.05 + .027 * Math.sin(foot.to * .83));
        const footHeading = from.yaw + toeOut + foot.blend * angleDifference(from.yaw + toeOut, to.yaw + nextToeOut);
        const ankle = ankleOffset(foot.pitch*moving, foot.lift*moving);
        const target = targets[side]!;
        const fromX = from.x + lateral * Math.cos(from.yaw);
        const fromZ = from.z - lateral * Math.sin(from.yaw);
        target.set(
          fromX + (to.x + lateral * Math.cos(to.yaw) - fromX) * foot.blend
            + ankle.forward * scale.z * Math.sin(footHeading),
          groundHeight(from.x,from.z)*(1-foot.blend) + groundHeight(to.x,to.z)*foot.blend + ankle.height * scale.y,
          fromZ + (to.z - lateral * Math.sin(to.yaw) - fromZ) * foot.blend
            + ankle.forward * scale.z * Math.cos(footHeading),
        );
        body.worldToLocal(target);
        const length = limb.knee.position.length() + limb.ankle.position.length();
        return { target, yaw: footHeading - heading, pitch: foot.pitch*moving, drop: hipDrop(limb.thigh.position, target, length) };
      });
      const drop = Math.max(...contacts.map(contact => contact.drop));
      model.position.y -= drop * scale.y;
      const armPhase = Math.cos(cycle - .34)*moving;
      torso.rotation.set(style.lean + .008 * Math.sin(rhythm), .072 * armPhase, .021 * transfer - .066 * turn);
      const glance = .16 * Math.sin(rhythm * .84) ** 5 + .28*(1-moving);
      head.rotation.set(-.018 + .019 * Math.sin(rhythm * .61),
        glance + .34 * angleDifference(heading, ahead.yaw) - .059 * armPhase, -.017 * transfer + .045 * turn);
      for (const [side, limb] of limbs.entries()) {
        const { target, yaw, pitch } = contacts[side]!;
        target.y += drop;
        solveLeg(limb.thigh, limb.knee, limb.ankle, target, yaw, pitch);
        const arm = Math.cos(cycle - (side === 0 ? .34 : .48) + side * Math.PI);
        const swing = style.arms[side]! * moving * (1 + .16 * Math.sin(rhythm + side * .71));
        limb.shoulder.rotation.x = -.025 + swing * arm;
        limb.elbow.rotation.x = -.11 - .135 * ((1 - arm) * .5) ** 2;
      }
    }
  });
  return <group name="Harbor walk">
    {figures.map(({ model }) => <primitive key={model.uuid} object={model} dispose={null} />)}
  </group>;
}
