"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group, Object3D, Vector3, Quaternion, LoopOnce } from "three";
import { ThreeElements, useFrame } from "@react-three/fiber";
import { useSound } from "./audio/useSound";
import { useGameState } from "@/store/gameState";

export type ManAnimation =
  | "Static Pose"
  | "Sit"
  | "Wipe Tears"
  | "Getting Up"
  | "Get Up Panic Start"
  | "Idle Near"
  | "Walk Near"
  | "Walk"
  | "Idle"
  | "Panic Start"
  | "Panic"
  | "Panic End"
  | "Running"
  | "Attack Run Start"
  | "Get Up Panic Start"
  | "Sit 2"
  | "Sit 2 Start"
  | "Swing"
  | "Attack"
  | "Attack Run"
  | "Attack Run Start";

type StalkerManProps = ThreeElements["group"];

type StalkerState = "stalking" | "jumpscare";

export function StalkerMan(props: StalkerManProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF("/optimized/man.glb");
  const { actions } = useAnimations(animations, group);
  const headRef = useRef<Object3D | null>(null);
  const { sound } = useSound();
  const { isDead, die, respawn } = useGameState();
  const lastFootstepTime = useRef(0);

  const [state, setState] = useState<StalkerState>("stalking");
  const [currentAnimation, setCurrentAnimation] = useState<ManAnimation>("Walk");

  useEffect(() => {
    const head = scene.getObjectByName("head_010");
    if (head) {
      headRef.current = head;
    }
  }, [scene]);

  // Animation Control
  useEffect(() => {
    const action = actions[currentAnimation];

    if (action) {
      action.reset().fadeIn(0.2).play();
      return () => {
        action.fadeOut(0.2);
      };
    }
  }, [actions, currentAnimation]);

  // State Machine & Logic
  useFrame((threeState, delta) => {
    if (!group.current) return;

    const manPos = group.current.position;
    const cameraPos = threeState.camera.position;
    const distToPlayer = manPos.distanceTo(cameraPos);

    // 1. Stalking Logic
    if (state === "stalking") {
      // Calculate position behind player
      const cameraDir = new Vector3();
      threeState.camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();

      // Target is 4 units behind the player
      const targetPos = cameraPos.clone().sub(cameraDir.clone().multiplyScalar(4));
      targetPos.y = 1.25; // Keep on ground

      // Move towards target
      const dirToTarget = targetPos.clone().sub(manPos).normalize();
      const distToTarget = manPos.distanceTo(targetPos);
      
      // Move faster if far away to catch up
      const speed = distToTarget > 5 ? 8 : 4; 
      
      if (distToTarget > 0.1) {
        group.current.position.add(dirToTarget.multiplyScalar(speed * delta));

        // Footsteps
        const now = threeState.clock.elapsedTime;
        const interval = speed > 6 ? 0.35 : 0.6;
        if (now - lastFootstepTime.current > interval) {
          sound.playFootstep();
          lastFootstepTime.current = now;
        }
      }

      // Rotate to face player
      const dirToPlayer = cameraPos.clone().sub(manPos).normalize();
      const angle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
      const targetRot = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle);
      group.current.quaternion.slerp(targetRot, 0.1);

      // Check if player sees us
      const dirToMan = manPos.clone().sub(cameraPos).normalize();
      const dot = cameraDir.dot(dirToMan);

      // If dot > 0.5, man is roughly in front of camera (within ~60 degrees)
      if (dot > 0.5) {
        if (!isDead) {
          setState("jumpscare");
          console.log("Stalker: Jumpscare!");
          die();
          sound.playOneShot("jumpscare", { volume: 1.0, group: "sfx" });
          setTimeout(() => {
            respawn();
          }, 3000);
        }
      }
    }

    // State -> Animation mapping
    if (state === "jumpscare" && currentAnimation !== "Attack") {
      setCurrentAnimation("Attack");
    }

    // Jumpscare Logic
    if (state === "jumpscare" && headRef.current) {


      const head = headRef.current;
      const headWorldPos = new Vector3();
      head.getWorldPosition(headWorldPos);

      const headWorldQuat = new Quaternion();
      head.getWorldQuaternion(headWorldQuat);

      const offset = new Vector3(0, 0, -0.4);
      offset.applyQuaternion(headWorldQuat);
      const targetPos = headWorldPos.clone().add(offset);

      threeState.camera.position.copy(targetPos);
      threeState.camera.lookAt(headWorldPos);
    }
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/optimized/man.glb");
