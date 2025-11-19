import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useSound } from "@/components/audio/useSound";
import { consumeInteract } from "../inputStore";
import { useGameState } from "@/store/gameState";
import { DebugGizmos } from "@/store/debugStore";

function useBasementDoor(scene: THREE.Group | undefined) {
  const { sound } = useSound();
  const { camera } = useThree();
  // Track both doors
  const _doorStartRef = useRef<THREE.Object3D | null>(null);
  const _doorEndRef = useRef<THREE.Object3D | null>(null);
  // Opening animation/state for DoorStart only
  const openingRef = useRef(false);
  const openedRef = useRef(false);
  const targetYRef = useRef(0);
  const initialYRef = useRef(0);


  const playerVelocity = useGameState((s) => s.playerVelocity);


  const doorClosedRef = useRef(false);

  // Locate the door in the loaded scene graph
  useEffect(() => {
    if (!scene) return;

    const doorFrameCutter = scene.getObjectByName("DoorStartCutter") as
      | THREE.Object3D
      | undefined;

    if (doorFrameCutter) {
      doorFrameCutter.visible = false;
    }

    const doorFrameCutterEnd = scene.getObjectByName("DoorCutterEnd") as
      | THREE.Object3D
      | undefined;
    if (doorFrameCutterEnd) {
      doorFrameCutterEnd.visible = false;
    }

    const doorStart = scene.getObjectByName("DoorStart") as
      | THREE.Object3D
      | undefined;
    const doorEnd = scene.getObjectByName("DoorEnd") as
      | THREE.Object3D
      | undefined;
    if (doorStart) {
      _doorStartRef.current = doorStart;
      initialYRef.current = doorStart.rotation.y;
    }
    if (doorEnd) {
      _doorEndRef.current = doorEnd;
    }
  }, [scene]);

  function closeDoor() {
    const door = _doorStartRef.current;
    if (!door) return;

    doorClosedRef.current = true;
    targetYRef.current = initialYRef.current;
    openingRef.current = true;
    openedRef.current = false;
    // play close slice
    sound.playDoorClose();
  }

  function openStartDoor(
    withScriptedMove: boolean,
    distanceToDoor: number = 0
  ) {
    const door = _doorStartRef.current;
    if (!door) {
      console.warn("DoorStart not found");
      return;
    }
    // Rotate 90 degrees around Y to open (invert direction to correct opening side)
    targetYRef.current = initialYRef.current - Math.PI / 2;
    openingRef.current = true;
    // play open slice
    sound.playDoorOpen();


    window.dispatchEvent(
      new CustomEvent("__on_door_opened__", { detail: { door: "start" } })
    )

    if (withScriptedMove) {
      const doorPos = new THREE.Vector3();
      door.getWorldPosition(doorPos);
      const lookAt: [number, number, number] = [
        doorPos.x - 10,
        doorPos.y,
        doorPos.z,
      ];
      window.dispatchEvent(
        new CustomEvent("__scripted_move__", {
          detail: {
            durationSec: 2.8,
            distance: 2.6 + distanceToDoor / 2,
            lockLook: true,
            lookAt,
            lookSlerp: 2.5,
            moveDelaySec: 0.35,
          },
        })
      );
    }
    // close after a bit
    setTimeout(() => {
      closeDoor();
    }, 3200);
  }

  function tryOpenStart(withScriptedMove: boolean) {
    const door = _doorStartRef.current;
    if (!door) {
      console.warn("DoorStart not found or already opened");
      return;
    }

    // do not open again if already closed
    if (doorClosedRef.current) {
      return;
    }


    
    console.log("Player velocity:", playerVelocity);



    // Check proximity to camera
    const doorPos = new THREE.Vector3();
    door.getWorldPosition(doorPos);
    const dist = doorPos.distanceTo(camera.position);
    const threshold = 2.0; // meters
    if (dist <= threshold) {
      openStartDoor(withScriptedMove, dist);
    }
  }

  function tryDoorEndTeleport(): boolean {
    const doorEnd = _doorEndRef.current;

    const doorStart = _doorStartRef.current;
    if (!doorEnd || !doorStart) {
      console.warn("DoorEnd or DoorStart not found");
      return false;
    }
    // Check proximity to DoorEnd
    const endPos = new THREE.Vector3();
    doorEnd.getWorldPosition(endPos);
    const dist = endPos.distanceTo(camera.position);
    const threshold = 3.0; // meters
    if (dist > threshold) {
      console.log("Too far from DoorEnd for teleport:", dist);
      return false;
    }

    // first walk towards door end (if not close enough yet)
    const doorPos = new THREE.Vector3();
    if (!doorEnd) {
      console.warn("DoorEnd not found");
      return false;
    }
    doorEnd.getWorldPosition(doorPos);
    const distToDoorEnd = doorPos.distanceTo(camera.position);
    const approachThreshold = 1;
    if (distToDoorEnd > approachThreshold) {
      console.log("Approaching DoorEnd before teleport");
      window.dispatchEvent(
        new CustomEvent("__scripted_move__", {
          detail: { durationSec: 1, distance: distToDoorEnd + 0.6 },
        })
      );
      // allow opening
      doorClosedRef.current = false;
      setTimeout(() => {
        tryDoorEndTeleport();
      }, 1100);
      return true;
    }

    // Map player's local XZ offset relative to DoorEnd onto DoorStart, preserving distance and side offset
    const endMatrix = new THREE.Matrix4().copy(doorEnd.matrixWorld);
    const invEndMatrix = new THREE.Matrix4().copy(endMatrix).invert();
    const startMatrix = new THREE.Matrix4().copy(doorStart.matrixWorld);

    const playerWorld = new THREE.Vector3().copy(camera.position);
    const playerLocalToEnd = playerWorld.clone().applyMatrix4(invEndMatrix);
    // Preserve only ground-plane offset; Y handled by keepY
    const localXZ = new THREE.Vector3(
      playerLocalToEnd.x,
      0,
      playerLocalToEnd.z
    );
    const targetWorld = localXZ.clone().applyMatrix4(startMatrix);

    const distanceOfPlayerFromDoorEnd = Math.hypot(
      playerLocalToEnd.x,
      playerLocalToEnd.z
    );

    // Compute yaw so the player looks at DoorStart
    const startPos = new THREE.Vector3();
    doorStart.getWorldPosition(startPos);

    const startTeleportPos = new THREE.Vector3();
    doorStart.getWorldPosition(startTeleportPos);
    startTeleportPos.sub(new THREE.Vector3(distanceOfPlayerFromDoorEnd, 0, 0)); // adjust for door center

    const lookDir = new THREE.Vector3().subVectors(startPos, startTeleportPos);
    lookDir.y = 0;
    lookDir.normalize();
    const yaw = Math.atan2(lookDir.x, lookDir.z);

    // Teleport player (preserve current Y/height) and set yaw to face the door
    window.dispatchEvent(
      new CustomEvent("__teleport_to__", {
        detail: {
          x: targetWorld.x,
          z: targetWorld.z,
          keepY: true,
          yaw: yaw,
        },
      })
    );

    // Increment loop after successful teleport to DoorStart
    try {
      useGameState.getState().incrementLoop();
    } catch {}

    // Open DoorStart (without forced forward move by default)
    openStartDoor(true);
    return true;
  }

  // Interaction is now unified via inputStore (pressInteract & consumeInteract)

  function isBumpingFrontDoor(): boolean {
    const door = _doorStartRef.current;
    if (!door) return false;
    let meshObj = door.children[0]
    if (!meshObj) return false;

    const mesh = meshObj as THREE.Mesh;

    // Check proximity to camera
    const doorPos = new THREE.Vector3();
    mesh.geometry.boundingBox!.getCenter(doorPos);
    mesh.localToWorld(doorPos);

    doorPos.y = camera.position.y;

    const dist = doorPos.distanceTo(camera.position);
    const threshold = 0.515; 
    if (dist > threshold) {
      return false;
    }

    
    
    // bumping door?
    const speedThreshold = 1.2; 

    // speed towards door
    const toDoor = new THREE.Vector3().subVectors(doorPos, camera.position).normalize();
    const forwardSpeed = toDoor.dot(new THREE.Vector3(playerVelocity.x, playerVelocity.y, playerVelocity.z));

    return forwardSpeed > speedThreshold;
  }

  function isBumpingEndDoor() {
    const doorEnd = _doorEndRef.current;
    if (!doorEnd) return false;

    const meshObj = doorEnd.children[0];
    if (!meshObj) return false;

    const mesh = meshObj as THREE.Mesh;
    // Check proximity to camera
    const doorPos = new THREE.Vector3();
    mesh.geometry.boundingBox!.getCenter(doorPos);
    mesh.localToWorld(doorPos);

    doorPos.y = camera.position.y;

    DebugGizmos.sphere(doorPos, 0.1, 'blue', 100);

    const dist = doorPos.distanceTo(camera.position);
    const threshold = 0.515;

    if (dist > threshold) {
      return false;
    }

    // bumping door?
    const speedThreshold = 1.2;
    // speed towards door
    const toDoor = new THREE.Vector3().subVectors(doorPos, camera.position).normalize();
    const forwardSpeed = toDoor.dot(new THREE.Vector3(playerVelocity.x, playerVelocity.y, playerVelocity.z));
    return forwardSpeed > speedThreshold;
  }

  // Poll mobile interact flag each frame; also advance opening animation
  useFrame((_, delta) => {
    if (isBumpingFrontDoor() && !openingRef.current) {
        tryOpenStart(true);
    }

    if (isBumpingEndDoor() && !openingRef.current) {
        tryDoorEndTeleport();
    }

    // if (!tryDoorEndTeleport()) {
    //     tryOpenStart(true);
    //   }
    // Animate door opening
    const door = _doorStartRef.current;
    if (!door) return;
    if (openingRef.current) {
      const speed = 1.2; // radians per second
      const y = door.rotation.y;
      const target = targetYRef.current;
      const step = Math.sign(target - y) * speed * delta;
      let next = y + step;
      // clamp overshoot
      if ((step > 0 && next >= target) || (step < 0 && next <= target)) {
        next = target;
        console.log("Door animation complete");
        openingRef.current = false;
        openedRef.current = !openedRef.current;
      }
      door.rotation.y = next;
    }
  });
}

export default useBasementDoor;
