"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Euler, MathUtils, Matrix4, Vector3 } from "three";

export interface LaggyPointerLockControlsRef {
  reset: () => void;
  lookAt: (x: number, y: number, z: number) => void;
}

interface LaggyPointerLockControlsProps {
  enabled?: boolean;
  sensitivity?: number;
  lagSpeed?: number; // Higher = faster (less lag). Default ~5-10.
  onLock?: () => void;
  onUnlock?: () => void;
  selector?: string;
}

export const LaggyPointerLockControls = forwardRef<
  LaggyPointerLockControlsRef,
  LaggyPointerLockControlsProps
>(({
  enabled = true,
  sensitivity = 0.002,
  lagSpeed = 10,
  onLock,
  onUnlock,
  selector,
}, ref) => {
  const { camera, gl } = useThree();
  const targetRotation = useRef(new Euler(0, 0, 0, "YXZ"));
  const isLocked = useRef(false);

  // Sync target with camera initially and on reset
  const reset = () => {
    // Ensure we capture the current rotation correctly
    targetRotation.current.copy(camera.rotation);
  };

  const lookAt = (x: number, y: number, z: number) => {
    const target = new Vector3(x, y, z);
    const mat = new Matrix4();
    mat.lookAt(camera.position, target, new Vector3(0, 1, 0));
    
    const euler = new Euler(0, 0, 0, "YXZ");
    euler.setFromRotationMatrix(mat);
    
    // Clamp pitch
    const PI_2 = Math.PI / 2;
    const pitch = Math.max(-PI_2 + 0.01, Math.min(PI_2 - 0.01, euler.x));
    
    targetRotation.current.x = pitch;
    targetRotation.current.y = euler.y;
  };

  useImperativeHandle(ref, () => ({
    reset,
    lookAt,
  }));

  useEffect(() => {
    // Initial sync
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (enabled) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    const domElement = selector
      ? document.querySelector(selector)
      : gl.domElement;

    if (!domElement) return;

    const onMouseMove = (event: MouseEvent) => {
      if (!isLocked.current || !enabled) return;

      const { movementX, movementY } = event;

      targetRotation.current.y -= movementX * sensitivity;
      targetRotation.current.x -= movementY * sensitivity;

      const PI_2 = Math.PI / 2;
      targetRotation.current.x = Math.max(
        -PI_2 + 0.01,
        Math.min(PI_2 - 0.01, targetRotation.current.x)
      );
    };

    const onPointerLockChange = () => {
      if (document.pointerLockElement === domElement) {
        isLocked.current = true;
        // Sync when locking to prevent jumps if camera moved while unlocked
        reset();
        onLock?.();
      } else {
        isLocked.current = false;
        onUnlock?.();
      }
    };

    const onPointerLockError = () => {
      console.error("PointerLockControls: Error locking pointer");
    };

    const onClick = () => {
        if (!isLocked.current && enabled) {
            (domElement as HTMLElement).requestPointerLock();
        }
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    domElement.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      domElement.removeEventListener("click", onClick);
    };
  }, [enabled, gl.domElement, onLock, onUnlock, selector, sensitivity]);

  useFrame((state, delta) => {
    if (!enabled) return;
    
    // Ensure rotation order is correct
    if (camera.rotation.order !== "YXZ") {
        camera.rotation.order = "YXZ";
    }

    // Damp rotation towards target
    // We use MathUtils.damp for smooth interpolation
    // x and y are Euler angles.
    
    camera.rotation.x = MathUtils.damp(camera.rotation.x, targetRotation.current.x, lagSpeed, delta);
    camera.rotation.y = MathUtils.damp(camera.rotation.y, targetRotation.current.y, lagSpeed, delta);
  });

  return null;
});
