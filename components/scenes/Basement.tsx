import { useGLTF } from "@react-three/drei";
import { ThreeElements, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTF } from "three/examples/jsm/Addons.js";
import { consumeInteract } from "@/components/inputStore";
import { useSound } from "@/components/audio/useSound";

function useBasementDoor(scene: THREE.Group | undefined) {
  const { sound } = useSound();
  const { camera } = useThree();
  const _doorRef = useRef<THREE.Object3D | null>(null);
  const openingRef = useRef(false);
  const openedRef = useRef(false);
  const targetYRef = useRef(0);
  const initialYRef = useRef(0);

  // Locate the door in the loaded scene graph
  useEffect(() => {
    if (!scene) return;
    const door = scene.getObjectByName("Door") as THREE.Object3D | undefined;
    if (!door) return;
    _doorRef.current = door;
    initialYRef.current = door.rotation.y;
    // console.debug("Basement door found", door);
  }, [scene]);

  // Interaction is now unified via inputStore (pressInteract & consumeInteract)

  // Poll mobile interact flag each frame; also advance opening animation
  useFrame((_, delta) => {
    if (consumeInteract()) {
      tryOpen();
    }
    // Animate door opening
    const door = _doorRef.current;
    if (!door) return;
    if (openingRef.current && !openedRef.current) {
      const speed = 1.2; // radians per second
      const y = door.rotation.y;
      const target = targetYRef.current;
      const step = Math.sign(target - y) * speed * delta;
      let next = y + step;
      // clamp overshoot
      if ((step > 0 && next >= target) || (step < 0 && next <= target)) {
        next = target;
        openingRef.current = false;
        openedRef.current = true;
      }
      door.rotation.y = next;
    }
  });

  function tryOpen() {
    const door = _doorRef.current;
    if (!door || openedRef.current) return;
    // Check proximity to camera
    const doorPos = new THREE.Vector3();
    door.getWorldPosition(doorPos);
    const dist = doorPos.distanceTo(camera.position);
    const threshold = 1.0; // meters
    if (dist <= threshold) {
      // Rotate 90 degrees around Y to open; flip direction to open away from user
      targetYRef.current = initialYRef.current + Math.PI / 2;
      openingRef.current = true;
      // play open slice
      sound.playDoorOpen();
      // Start scripted forward move immediately as handle turns, and look at the door
      // get the width of the door to offset lookAt
      const doorWidth = door.scale.x;
      const lookAt: [number, number, number] = [
        doorPos.x - doorWidth / 3,
        doorPos.y,
        doorPos.z + 5,
      ];
      window.dispatchEvent(
        new CustomEvent("__scripted_move__", {
          detail: {
            durationSec: 2.2,
            distance: 2.4,
            lockLook: true,
            lookAt,
            lookSlerp: 2.5,
            moveDelaySec: 0.35,
          },
        })
      );

      // after 2.5 seconds close the door
      setTimeout(() => {
        closeDoor();
      }, 3200);
    }
  }

  function closeDoor() {
    const door = _doorRef.current;
    if (!door || !openedRef.current) return;
    targetYRef.current = initialYRef.current;
    openingRef.current = true;
    openedRef.current = false;
    // play close slice
    sound.playDoorClose();
  }
}

export default function Basement(props: ThreeElements["group"]) {
  const url = "/optimized/basement.glb";

  const gltf = useGLTF(url);

  useBasementDoor(gltf.scene);

  useEffect(() => {
    if (!gltf.scene) return;
    // find the light
    const light = gltf.scene.getObjectByName("Point") as
      | THREE.PointLight
      | undefined;

    if (light) {
      light.color = new THREE.Color("#f0e68c");
      light.intensity = 0.3;
      light.distance = 8;
    }

    const lampPoint1 = gltf.scene.getObjectByName("LampPoint_1") as
      | THREE.PointLight
      | undefined;
    if (lampPoint1) {
      lampPoint1.color = new THREE.Color("#f0e68c");
      lampPoint1.intensity = 0.3;
      lampPoint1.distance = 8;
    }

    gltf.scene.traverse((obj) => {
        // Enable shadows on meshes
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyObj = obj as any;
        if (anyObj.isMesh) {
            anyObj.castShadow = false;
            anyObj.receiveShadow = false;

            if (anyObj.material) {
                anyObj.material.envMapIntensity = 0.5;
            }
        }
    });
  }, [gltf.scene]);

  return (
    <group {...props}>
      <primitive object={gltf.scene} />
    </group>
  );
}

useGLTF.preload("/optimized/basement.glb");
