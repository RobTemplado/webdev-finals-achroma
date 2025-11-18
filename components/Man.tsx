"use client";

import React, { useEffect, useRef, useState } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { Group, Object3D, Vector3, Quaternion, LoopOnce } from "three";
import { ThreeElements, useFrame } from "@react-three/fiber";
import { useGameState } from "@/store/gameState";
import { useSound } from "./audio/useSound";

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

type ManProps = ThreeElements["group"] & {
  animation?: ManAnimation;
  isEnemy?: boolean;
};

type EnemyState =
  | "sit"
  | "get_up_panic_start"
  | "attack_start"
  | "chase"
  | "jumpscare";

export function Man({
  animation: overrideAnimation,
  isEnemy = true,
  ...props
}: ManProps) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF("/optimized/man.glb");
  const { actions } = useAnimations(animations, group);
  const headRef = useRef<Object3D | null>(null);
  const { isDead, die, respawn } = useGameState();
  const { sound } = useSound();

  const [enemyState, setEnemyState] = useState<EnemyState>("sit");
  const [currentAnimation, setCurrentAnimation] = useState<ManAnimation>("Sit");

  useEffect(() => {
    const head = scene.getObjectByName("head_010");
    if (head) {
      headRef.current = head;
    }
  }, [scene]);

  // Animation Control
  useEffect(() => {
    const animToPlay = overrideAnimation || currentAnimation;
    const action = actions[animToPlay];

    if (action) {
      // Reset and play
      action.reset().fadeIn(0.2).play();

      // Handle one-shot animations for state transitions
      if (isEnemy && !overrideAnimation) {
        const oneShotAnims = [
          "Getting Up",
          "Get Up Panic Start",
          "Attack Run Start",
        ];

        if (oneShotAnims.includes(animToPlay)) {
          action.setLoop(LoopOnce, 1);
          action.clampWhenFinished = true;

          const onFinished = () => {
            if (animToPlay === "Getting Up") setEnemyState("get_up_panic_start");
            if (animToPlay === "Get Up Panic Start") setEnemyState("attack_start");
            if (animToPlay === "Attack Run Start") setEnemyState("chase");
          };

          // Use mixer event or timeout as fallback
          const duration = action.getClip().duration;
          const timeout = setTimeout(onFinished, duration * 1000 - 100); // slightly early to blend
          return () => {
            clearTimeout(timeout);
            action.fadeOut(0.2);
          };
        }
      }

      return () => {
        action.fadeOut(0.2);
      };
    }
  }, [actions, currentAnimation, overrideAnimation, isEnemy, enemyState]);

  // State Machine & Logic
  useFrame((state, delta) => {
    if (!isEnemy || !group.current) return;

    const manPosVec = group.current.position;
    const cameraPos = state.camera.position;
    const distToPlayer = manPosVec.distanceTo(cameraPos);

    // 1. Sit -> Getting Up (Trigger: Look at)
    if (enemyState === "sit") {
      const dirToMan = manPosVec.clone().sub(cameraPos).normalize();
      const cameraDir = new Vector3();
      state.camera.getWorldDirection(cameraDir);

      // Dot product > 0.9 means looking roughly towards it
      if (cameraDir.dot(dirToMan) > 0.9 && distToPlayer < 10) {
        setEnemyState("get_up_panic_start");
        console.log("Enemy: Getting Up!");
      }
    }

    // State -> Animation mapping
    // if (enemyState === "getting_up" && currentAnimation !== "Getting Up")
    //   setCurrentAnimation("Getting Up");
    if (enemyState === "get_up_panic_start" && currentAnimation !== "Get Up Panic Start")
      setCurrentAnimation("Get Up Panic Start");
    if (enemyState === "attack_start" && currentAnimation !== "Attack Run Start")
      setCurrentAnimation("Attack Run Start");
    if (enemyState === "chase" && currentAnimation !== "Attack Run")
      setCurrentAnimation("Attack Run");
    if (enemyState === "jumpscare" && currentAnimation !== "Attack")
      setCurrentAnimation("Attack");

    // Chase Logic
    if (enemyState === "chase") {
      const dirToPlayer = cameraPos.clone().sub(manPosVec).normalize();
      dirToPlayer.y = 0; // Keep movement flat
      dirToPlayer.normalize();
      
      const speed = 4.5;

      // Move towards player
      group.current.position.add(dirToPlayer.multiplyScalar(speed * delta));

      // Rotate to face player
      const angle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
      const targetRot = new Quaternion().setFromAxisAngle(
        new Vector3(0, 1, 0),
        angle
      );
      group.current.quaternion.slerp(targetRot, 0.1);

      // Trigger Jumpscare
      if (distToPlayer < 1.5) {
        if (!isDead) {
          setEnemyState("jumpscare");
          die();
          sound.playOneShot("jumpscare", { volume: 1.0, group: "sfx" });
          setTimeout(() => {
            respawn();
          }, 3000);
        }
      }
    }

    // Jumpscare Logic (Lock Camera)
    if (enemyState === "jumpscare" && headRef.current) {
      const head = headRef.current;
      const headWorldPos = new Vector3();
      head.getWorldPosition(headWorldPos);

      const headWorldQuat = new Quaternion();
      head.getWorldQuaternion(headWorldQuat);

      // Position camera directly in front of face
      const offset = new Vector3(0, 0, -0.4);
      offset.applyQuaternion(headWorldQuat);
      const targetPos = headWorldPos.clone().add(offset);

      state.camera.position.copy(targetPos);
      state.camera.lookAt(headWorldPos);
    }
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

export default Man;

useGLTF.preload("/optimized/man.glb");
