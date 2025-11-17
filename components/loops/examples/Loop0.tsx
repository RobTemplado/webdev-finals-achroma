"use client";

import { useEffect } from "react";
import type { LoopComponentProps } from "../loopRegistry";
import { registerLoop } from "../loopRegistry";
import { TriggerBox, ProximityTrigger } from "../Trigger";
import { useSound } from "@/components/audio/useSound";
import { useThree } from "@react-three/fiber";
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
  const { scene } = useThree();
  const { sound } = useSound();

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
~

    setCastShadowOnObjects(scene, [
      "hanging_picture_frame_02001",
      "~001",
      "Hanging_Industrial_Lamp"
    ])

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

// Register example loop 0 at import-time
registerLoop(0, Loop0Impl);

export default Loop0Impl;
