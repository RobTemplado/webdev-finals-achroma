"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { LoopComponentProps } from "../loopRegistry";
import { registerLoop } from "../loopRegistry";
import { useSound } from "@/components/audio/SoundProvider";

// Simple deterministic hash for stable random per-object
function hashString(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function Loop2Impl({ loop }: LoopComponentProps) {
  const { scene, camera } = useThree();
  const { sound } = useSound();
  const originalPosRef = useMemo(() => new THREE.Vector3(), []);
  const wifeLightRef = useRef<THREE.PointLight | null>(null);
  const offLightOriginalRef = useRef<{ intensity: number } | null>(null);
  const slideStateRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startX: number;
    endX: number;
  } | null>(null);

  // Precompute a stable random Y tilt for each frame name
  const tiltByName = useMemo(() => {
    const names = [
      "hanging_picture_frame_02003",
      "hanging_picture_frame_02002",
      "hanging_picture_frame_02",
      "hanging_picture_frame_02001",
    ];
    const map = new Map<string, number>();
    for (const name of names) {
      const h = hashString("loop2-frame-y-" + name + "-" + loop);
      const r = (h % 1000) / 1000; // 0-1
      // Tilt range: about -12deg .. +12deg
      const maxTilt = (12 * Math.PI) / 180;
      const tilt = (r - 0.5) * 2 * maxTilt;
      map.set(name, tilt);
    }
    return map;
  }, [loop]);

  useEffect(() => {
    if (!scene) return;

    const wife = scene.getObjectByName("Wife");

    const target = wife?.children[0];
    if (target) {
      // Store original position
      originalPosRef.set(
        target.position.x,
        target.position.y,
        target.position.z
      );
      target.castShadow = true;
    }

    if (wife) {
      wife.visible = true;
    }

    sound.playLoopingSegment(
      "wife_crying",
      {
        group: "sfx",
        start: 0,
        duration: 8,
        volume: 0.05,
      },
      "crying_loop2"
    );

    const frameNames = [
      "hanging_picture_frame_02003",
      "hanging_picture_frame_02002",
      "hanging_picture_frame_02",
      "hanging_picture_frame_02001",
    ];

    const originals: Array<{
      object: THREE.Object3D;
      rotationY: number;
    }> = [];

    for (const name of frameNames) {
      const obj = scene.getObjectByName(name);
      if (!obj) {
        console.warn(`Loop2: Object not found: ${name}`);
        continue;
      }
      originals.push({ object: obj, rotationY: obj.rotation.y });

      const tilt = tiltByName.get(name) ?? 0;
      obj.rotation.y = obj.rotation.y + tilt;
    }

    // Turn off specific light by id inside LevelLights
    setTimeout(() => {
      const lightsGroup = scene.getObjectByName("LevelLights");
      if (lightsGroup) {
        lightsGroup.children.forEach((child) => {
          if (!child.name?.startsWith?.("Light-")) return;
          const lightId = child.name.substring(6);
          if (lightId !== "93421717-5118-47b2-b80d-14ab14a0eecb") return;
          let lightObj: any | null = null;
          child.traverse((n) => {
            if ((n as any).isLight) lightObj = n;
          });
          if (
            lightObj &&
            typeof lightObj.intensity === "number" &&
            !offLightOriginalRef.current
          ) {
            // Cache original intensity then turn it off
            offLightOriginalRef.current = { intensity: lightObj.intensity };
            lightObj.intensity = 0.03;
          }
        });
      }
    }, 100);

    // Unlock door for now
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("__unlock_end_door__"));
    }, 3500);

    return () => {
      clearTimeout(t);
      // Restore original rotations when Loop 2 unmounts
      for (const { object, rotationY } of originals) {
        object.rotation.y = rotationY;
      }
      // Restore the turned-off light's intensity
      const lightsGroup = scene.getObjectByName("LevelLights");
      if (lightsGroup && offLightOriginalRef.current) {
        lightsGroup.children.forEach((child) => {
          if (!child.name?.startsWith?.("Light-")) return;
          const lightId = child.name.substring(6);
          if (lightId !== "93421717-5118-47b2-b80d-14ab14a0eecb") return;
          let lightObj: any | null = null;
          child.traverse((n) => {
            if ((n as any).isLight) lightObj = n;
          });
          if (lightObj && typeof lightObj.intensity === "number") {
            lightObj.intensity = offLightOriginalRef.current!.intensity;
          }
        });
      }
    };
  }, [scene, tiltByName]);

  // Runtime proximity check: when close, smoothly slide target along +X then hide
  useFrame((state) => {
    if (!scene || !camera) return;
    const wife = scene.getObjectByName("Wife");
    const target = wife?.children[0];
    if (!target) return;

    const camPos = camera.position;
    const targetPos = new THREE.Vector3();
    target.getWorldPosition(targetPos);
    const dist = camPos.distanceTo(targetPos);

    const now = state.clock.getElapsedTime();
    const slide = slideStateRef.current;

    // If a slide is in progress, interpolate X
    if (slide && slide.active) {
      const t01 = Math.min(1, (now - slide.startTime) / slide.duration);
      const eased = t01 * t01 * (3 - 2 * t01); // smoothstep
      const x = slide.startX + (slide.endX - slide.startX) * eased;
      target.position.y = x;
      if (t01 >= 1) {
        slide.active = false;
        target.visible = false;
        // Play suspense SFX when Wife finishes moving away
      }
      return;
    }

    // No active slide: check for trigger distance
    if (dist <= 6.27 && target.visible) {
      const offset = 1.5; // how far to slide along local X

      sound.stopLoop("crying_loop2");

      sound.playSegment("suspense", {
        group: "sfx",
        start: 0.2,
        volume: 0.7,
      });

      slideStateRef.current = {
        active: true,
        startTime: now,
        duration: 0.4, // seconds
        startX: target.position.y,
        endX: target.position.y + offset,
      };
    }
  });

  return null;
}

export default Loop2Impl;
