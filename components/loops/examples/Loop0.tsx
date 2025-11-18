"use client";

import { useEffect, useRef } from "react";
import type { LoopComponentProps } from "../loopRegistry";
import { registerLoop } from "../loopRegistry";
import { TriggerBox, ProximityTrigger } from "../Trigger";
import { useSound } from "@/components/audio/useSound";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function enableShadowsOnObject(
  scene: THREE.Scene,
  name: string,
  options: { cast?: boolean; receive?: boolean; logLabel?: string } = {}
) {
  const { cast = true, receive = false, logLabel } = options;
  const object = scene.getObjectByName(name);
  if (!object) return;

  object.castShadow = cast;
  object.receiveShadow = receive;

  object.traverse((child) => {
    if ((child as any).isMesh) {
      if (logLabel) {
        console.log(`enabling shadows on ${logLabel} mesh`, child.name);
      }
      const mesh = child as THREE.Mesh;
      mesh.castShadow = cast;
      mesh.receiveShadow = receive;
    }
  });

  return object;
}

function setReceiveShadowOnObjects(scene: THREE.Scene, names: string[]) {
  names.forEach((name) => {
    const obj = scene.getObjectByName(name);
    if (obj) {
      obj.receiveShadow = true;
    }
  });
}

function setCastShadowOnObjects(scene: THREE.Scene, names: string[]) {
  names.forEach((name) => {
    const obj = scene.getObjectByName(name);
    if (obj) {
      obj.castShadow = true;
    }
  });
}

function Loop0Impl({ loop }: LoopComponentProps) {
  const { scene, camera, clock } = useThree();
  const { sound } = useSound();

  const lightAnimRef = useRef<{
    active: boolean;
    startTime: number;
    delay: number;
    light: THREE.PointLight | null;
    targetIntensity: number;
    duration: number;
    initialized: boolean;
  }>({
    active: false,
    startTime: 0,
    delay: 201,
    light: null,
    targetIntensity: 2,
    duration: 1,
    initialized: false,
  });

  useFrame((state) => {
    // Try to find and initialize the light if not done yet
    if (!lightAnimRef.current.initialized) {
      const group = scene.getObjectByName("LevelLights");
      if (group) {
        group.children.forEach((child) => {
          // Check for ID match (assuming name format "Light_<uuid>")
          if (child.name.includes("9bbeb44a-899c-431c-b8cf-f70bf0523f0e")) {
            const light = child as THREE.PointLight;
            light.intensity = 0; // Start dim
            lightAnimRef.current.light = light;
            lightAnimRef.current.startTime = state.clock.elapsedTime;
            // configure delay before fade-in starts (in seconds)
            lightAnimRef.current.delay = 0.5;
            lightAnimRef.current.active = true;
            lightAnimRef.current.initialized = true;
            console.log("Loop0: Light found and animation started");
          }
        });
      }
    }

    // Animation logic
    if (lightAnimRef.current.active && lightAnimRef.current.light) {
      const { startTime, delay, duration, light, targetIntensity } =
        lightAnimRef.current;
      const now = state.clock.elapsedTime;
      const elapsed = now - startTime;

      // wait for delay before starting the fade-in
      if (elapsed < delay) return;

      const animTime = elapsed - delay;
      const t = Math.min(animTime / duration, 1);

      // Ease in out
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      light.traverse((child) => {
        if ((child as any).isLight) {
          const light = child as THREE.PointLight;
          light.intensity = targetIntensity * eased;
        }
      });

      if (t >= 1) {
        lightAnimRef.current.active = false;
      }
    }
  });

  function playOpeningSequence() {
    const door = scene.getObjectByName("DoorStart")!;
    const position = new THREE.Vector3();
    door.getWorldPosition(position);
    position.add(new THREE.Vector3(0, 0.2, -0.5));

    // Dispatch event to force camera look-at via FPSControls
    window.dispatchEvent(
      new CustomEvent("__camera_look_at__", {
        detail: { x: position.x, y: position.y, z: position.z },
      })
    );

    sound.playLoopingSegment(
      "static_light",
      {
        start: 0,
        volume: 0.05,
      },
      "static_light"
    );

    sound.playSegment("door_creak", {
      start: 0,
      volume: 0.3,
    });

    // rotate door slightly (1-5 degrees)
    const initialRotation = door.rotation.y;
    const targetRotation = initialRotation + THREE.MathUtils.degToRad(-13);

    const duration = 3300;
    const startTime = performance.now();

    function animateDoor(time: number) {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);

      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      door.rotation.y =
        initialRotation + (targetRotation - initialRotation) * eased;

      if (t < 1) {
        requestAnimationFrame(animateDoor);
      }
    }
    requestAnimationFrame(animateDoor);
  }

  useEffect(() => {
    setTimeout(() => {
      playOpeningSequence();
    }, 100);

    const onDoorOpened = () => {
      // start radio
      window.dispatchEvent(
        new CustomEvent("__radio_start__", { detail: { radio: "main" } })
      );
    };

    window.addEventListener("__on_door_opened__", onDoorOpened);
    return () => {
      sound.stopLoop("static_loop");
      window.removeEventListener("__on_door_opened__", onDoorOpened);
    };
  }, []);

  useEffect(() => {
    sound.playMusic("ambient_1", { loop: true, fade: 1, volume: 0.15 });

    if (!scene) return;

    const windowCutter = scene.getObjectByName("WindowCutter");
    if (windowCutter) {
      windowCutter.visible = false;
    }

    enableShadowsOnObject(scene, "DoorStart", {
      cast: true,
      receive: false,
      logLabel: "doorStart",
    });

    enableShadowsOnObject(scene, "Sketchfab_model.002", {
      cast: true,
      receive: false,
    });

    enableShadowsOnObject(scene, "DoorFrameStart", {
      cast: true,
      receive: false,
      logLabel: "doorFrameStart",
    });

    const wives = ["Wife"];
    wives.forEach((wifeName) => {
      const wife = enableShadowsOnObject(scene, wifeName, {
        cast: true,
        receive: false,
        logLabel: "wife",
      });

      if (wife) {
        wife.visible = false;
      }
    });

    const floors = [
      "Plane003",
      "Plane009",
      "Plane026",
      "Plane004",
      "Plane005",
      "Plane007",
      "Plane008",
      "Plane011",
      "Plane015",
      "Plane021",
      "Plane031",
    ];
    setReceiveShadowOnObjects(scene, floors);

    setCastShadowOnObjects(scene, [
      "Old Wooden Classical Chair",
      "OldWoodenClassicalChair",
      "wood",
      "wood001",
    ]);

    enableShadowsOnObject(scene, "Hanging Industrial Lamp", {
      cast: true,
      receive: false,
      logLabel: "lamp",
    });

    enableShadowsOnObject(scene, "SmallTable", {
      cast: true,
      receive: false,
    });

    enableShadowsOnObject(scene, "SmallTable001", {
      cast: true,
      receive: false,
    });

    enableShadowsOnObject(scene, "Root001", {
      cast: true,
      receive: true,
    });

    enableShadowsOnObject(scene, "standing_picture_frame_02001", {
      cast: true,
      receive: false,
    });

    enableShadowsOnObject(scene, "Radio", {
      cast: true,
      receive: false,
    });

    enableShadowsOnObject(scene, "Sketchfab_model014", {
      cast: true,
      receive: false,
    });

    enableShadowsOnObject(scene, "Indoor_Table__Plant", {
      cast: true,
      receive: true,
    });

    setCastShadowOnObjects(scene, [
      "Beer_Bottle_330ml011",
      "Beer_Bottle_330ml013",
      "Beer_Bottle_330ml012",
      "Beer_Bottle_330ml014",
      "Beer_Bottle_330ml015",
      "Beer_Bottle_330ml010",
      "Beer_Bottle_330ml004",
      "Beer_Bottle_330ml003",
      "Beer_Bottle_330ml005",
      "Beer_Bottle_330ml007",
      "Beer_Bottle_330ml009",
    ]);
    ~setCastShadowOnObjects(scene, [
      "hanging_picture_frame_02001",
      "~001",
      "Hanging_Industrial_Lamp",
    ]);

    enableShadowsOnObject(scene, "TableLamp", {
      cast: true,
      receive: true,
      logLabel: "first lamp",
    });

    const wallBesideCabinets = [
      "Wall020",
      "Wall036",
      "Wall015",
      "Wall033",
      "Wall014",
      "Wall023",
      "Wall003",
      "Wall004",
      "Wall019",
      "Wall034",
      "Wall024",
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

    const cabinet2 = scene.getObjectByName("Sketchfab_model002");
    if (cabinet2) {
      cabinet2.receiveShadow = true;
      cabinet2.castShadow = true;
    }

    const frame2 = scene.getObjectByName("standing_picture_frame_02001");
    if (frame2) {
      frame2.receiveShadow = true;
      frame2.castShadow = true;
    }
    const cabinet = enableShadowsOnObject(scene, "Sketchfab_model010", {
      cast: true,
      receive: true,
      logLabel: "cabinet",
    });
    if (cabinet) {
      cabinet.visible = true;
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

export default Loop0Impl;
