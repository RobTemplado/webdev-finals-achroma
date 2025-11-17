"use client";

import { useEffect } from "react";
import type { LoopComponentProps } from "../loopRegistry";
import { registerLoop } from "../loopRegistry";
import { TriggerBox, ProximityTrigger } from "../Trigger";
import { useSound } from "@/components/audio/useSound";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

function Loop0Impl({ loop }: LoopComponentProps) {
  const { scene } = useThree();
  const { sound } = useSound();

  useEffect(() => {
    sound.playMusic("ambient_1", { loop: true, fade: 1, volume: 0.15 });

    if (!scene) return;

    const windowCutter = scene.getObjectByName("WindowCutter");
    if (windowCutter) {
      windowCutter.visible = false;
    }

    const doorStart = scene.getObjectByName("DoorStart");
    if (doorStart) {
      console.log("enabling shadows on doorStart");
      doorStart.castShadow = true;
      doorStart.traverse((child) => {
        if ((child as any).isMesh) {
          console.log("enabling shadows on doorStart mesh", child.name);
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = false;
        }
      });
    }

    const doorFrameStart = scene.getObjectByName("DoorFrameStart");
    if (doorFrameStart) {
      console.log("enabling shadows on doorFrameStart");
      doorFrameStart.castShadow = true;
      doorFrameStart.traverse((child) => {
        if ((child as any).isMesh) {
          console.log("enabling shadows on doorFrameStart mesh", child.name);
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = false;
        }
      });
    }

    const wives = ["Wife"];
    wives.forEach((wifeName) => {
      const wife = scene.getObjectByName(wifeName);
      if (wife) {
        wife.castShadow = true;
        wife.receiveShadow = false;

        wife.traverse((child) => {
          if ((child as any).isMesh) {
            console.log("enabling shadows on wife mesh", child.name);
            const mesh = child as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = false;
          }
        });

        wife.visible = false;
      }
    });

    const floors = [
      "Plane003",
      "Plane004",
      "Plane005",
      "Plane007",
      "Plane008",
      "Plane011",
      "Plane015",
      "Plane021",
      "Plane031",
    ];
    floors.forEach((floorName) => {
      const floor = scene.getObjectByName(floorName);
      if (floor) {
        floor.receiveShadow = true;
      }
    });

    const lamp = scene.getObjectByName("hanging_industrial_lamp");
    if (lamp) {
      lamp.castShadow = true;

      lamp.traverse((child) => {
        if ((child as any).isMesh) {
          console.log("enabling shadows on lamp mesh", child.name);
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = false;
        }
      });
    }

    const wallBesideCabinets = [
      "Wall020",
      "Wall015",
      "Wall033",
      "Wall014",
      "Wall023",
      "Wall003",
      "Wall004",
    ];
    wallBesideCabinets.forEach((wallName) => {
      const wallBesideCabinet = scene.getObjectByName(wallName);
      if (wallBesideCabinet) {
        wallBesideCabinet.receiveShadow = true;
        wallBesideCabinet.castShadow = true;

        wallBesideCabinet.traverse((child) => {
          if ((child as any).isMesh) {
            console.log(
              "enabling shadows on wall beside cabinet mesh",
              child.name
            );
            const mesh = child as THREE.Mesh;
            mesh.castShadow = false;
            mesh.receiveShadow = true;
          }
        });
      }
    });

    const cabinet = scene.getObjectByName("Sketchfab_model010");
    if (cabinet) {
      // cabinet.castShadow = true;
      // cabinet.receiveShadow = true;

      cabinet.traverse((child) => {
        if ((child as any).isMesh) {
          console.log("enabling shadows on cabinet mesh", child.name);
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = false;
        }
      });
    }

    const cube = scene.getObjectByName("Cube001");
    if (cube) {
      console.log("enabling shadows on cube");
      cube.castShadow = true;
      // cube.receiveShadow = true;
    }

    const pictureFrame = scene.getObjectByName("standing_picture_frame_02");
    if (pictureFrame) {
      pictureFrame.receiveShadow = true;
      pictureFrame.castShadow = true;
    }

    return () => {
      sound.stopMusic(1);
    };
  }, [scene, sound]);

  return <></>;
}

// Register example loop 0 at import-time
registerLoop(0, Loop0Impl);

export default Loop0Impl;
