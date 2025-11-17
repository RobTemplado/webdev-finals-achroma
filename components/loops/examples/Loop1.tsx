"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import type { LoopComponentProps } from "../loopRegistry";
import { registerLoop } from "../loopRegistry";
import { useSound } from "../../audio/useSound";

function hashString(s: string) {
  let h = 2166136261 >>> 0; // FNV-1a base
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ApplyLoop1Lighting() {
  const { scene } = useThree();
  const { sound } = useSound();
  const originals = useRef(
    new Map<string, { color?: THREE.Color; intensity?: number }>()
  );
  // Flicker state per light uuid
  const flickerState = useRef(
    new Map<
      string,
      {
        baseIntensity: number;
        amp: number;
        speed: number;
        phase: number;
        nextBlinkAt: number;
        blinkUntil: number;
      }
    >()
  );
  const timeRef = useRef(0);

  const OFF_ID = "fb10b68d-4991-46d5-b753-0d9b73b612d3";
  const RED_ID = "5182de41-c1c2-41df-a0e0-5b11ed66b4d1";
  const DIM_ID = "7ca22c94-e50a-4ac4-b160-37bba6d45f10";
  const DIM_FACTOR = 0.3; // 30% of original intensity

  // Helper to apply specific rules to lights by id
  function applyRules() {
    const group = scene.getObjectByName("LevelLights");
    if (!group) return;
    group.children.forEach((child) => {
      if (!child.name?.startsWith?.("Light-")) return;
      const lightId = child.name.substring(6);
      // find the light object inside this group
      let lightObj: any | null = null;
      child.traverse((n) => {
        if ((n as any).isLight) lightObj = n;
      });
      if (!lightObj) return;
      if (lightObj.type === "AmbientLight") return;
      const uuid = lightObj.uuid as string;
      // snapshot originals
      if (!originals.current.has(uuid)) {
        originals.current.set(uuid, {
          color: lightObj.color?.clone?.(),
          intensity:
            typeof lightObj.intensity === "number"
              ? lightObj.intensity
              : undefined,
        });
      }
      // apply per-id rule
      if (lightId === OFF_ID) {
        if (typeof lightObj.intensity === "number") lightObj.intensity = 0;
      } else if (lightId === RED_ID) {
        if (lightObj.color) lightObj.color = new THREE.Color(0xff2a2a);
      } else if (lightId === DIM_ID) {
        if (typeof lightObj.intensity === "number") {
          const base =
            originals.current.get(uuid)?.intensity ?? lightObj.intensity;
          lightObj.intensity = Math.max(0, base * DIM_FACTOR);
        }
      }

      // initialize flicker base intensity after rules are applied
      if (typeof lightObj.intensity === "number") {
        const current = flickerState.current.get(uuid);
        if (!current) {
          const base = Math.max(0, lightObj.intensity);
          // derive deterministic pseudo-randoms from uuid
          const h = hashString(uuid);
          const r1 = (h % 1000) / 1000;
          const r2 = ((h >>> 10) % 1000) / 1000;
          const r3 = ((h >>> 20) % 1000) / 1000;
          const amp = 0.15 + 0.2 * r1; // 15% - 35%
          const speed = 4 + 8 * r2; // 4 - 12 Hz-ish (scaled later)
          const phase = Math.PI * 2 * r3;
          flickerState.current.set(uuid, {
            baseIntensity: base,
            amp,
            speed,
            phase,
            nextBlinkAt: 1 + 4 * r2, // first blink between 1-5s
            blinkUntil: -1,
          });
        } else {
          // keep base in sync if rules changed intensity (e.g. after initial frames)
          current.baseIntensity = Math.max(0, lightObj.intensity);
        }
      }
    });
  }

  // Apply on mount and for the first few frames to catch async lights
  let frames = 0;
  useFrame((_, delta) => {
    timeRef.current += delta;
    if (frames < 60) {
      applyRules();
      frames++;
    }

    const group = scene.getObjectByName("LevelLights");
    if (!group) return;
    group.traverse((obj) => {
      const light = obj as any as THREE.Light & { userData?: any };
      if (!(light as any)?.isLight) return;
      if (light.type === "AmbientLight") return;
      const uuid = light.uuid as string;
      const st = flickerState.current.get(uuid);
      if (!st) return;
      const base = st.baseIntensity;
      if (!(typeof base === "number") || base <= 0) return;

      // Occasionally hard blink
      const t = timeRef.current;
      if (t >= st.nextBlinkAt) {
        const h = hashString(uuid + ":blink:" + Math.floor(t));
        const rA = (h % 1000) / 1000;
        const rB = ((h >>> 12) % 1000) / 1000;
        const dur = 0.04 + 0.12 * rA; // 40-160ms
        st.blinkUntil = t + dur;
        st.nextBlinkAt = t + 2 + 5 * rB; // next in 2-7s

        // Play light off at blink start (segment 1s -> end)
        sound?.playSegment("lights_on_off", {
          start: 1,
          group: "sfx",
          volume: 0.6,
        });
      }

      let mult = 1;
      if (t <= st.blinkUntil) {
        mult = 0.05; // deep dip during blink
        // When lights dip (off-ish), play the "on" click (0-1s segment)
        sound?.playSegment("lights_on_off", {
          start: 0,
          duration: 1,
          group: "sfx",
          volume: 0.5,
        });
      } else {
        // Smooth noisy jitter: two sines with different speeds
        const n1 = Math.sin((t * st.speed + st.phase) * 2.0);
        const n2 = Math.sin((t * (st.speed * 0.37) + st.phase * 1.7) * 3.0);
        const noise = (n1 + 0.5 * n2) * 0.5; // roughly [-0.75, 0.75]
        mult = 1 - st.amp * 0.5 + st.amp * (noise * 0.5 + 0.5); // ~ [1-amp, 1]
      }

      const newIntensity = Math.max(0, base * mult);
      if (typeof (light as any).intensity === "number") {
        (light as any).intensity = newIntensity;
      }
    });
  });

  useEffect(() => {
    applyRules();
    return () => {
      // restore original color/intensity per light
      const group = scene.getObjectByName("LevelLights");
      if (!group) return;
      group.traverse((obj) => {
        const light = obj as any as THREE.Light;
        if (!light || !(light as any).isLight) return;
        const uuid = light.uuid as string;
        const orig = originals.current.get(uuid);
        if (orig?.color) light.color = orig.color;
        if (
          orig?.intensity != null &&
          typeof (light as any).intensity === "number"
        ) {
          (light as any).intensity = orig.intensity;
        }
      });
      originals.current.clear();
      flickerState.current.clear();
    };
  }, [scene]);

  return null;
}

function Loop1Impl({ loop }: LoopComponentProps) {
  // Put any extra loop-specific content here: props, triggers, etc.
  return <ApplyLoop1Lighting />;
}

// Register loop 1
registerLoop(1, Loop1Impl);

export default Loop1Impl;
