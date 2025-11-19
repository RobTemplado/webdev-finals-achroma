"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Euler, MathUtils, Matrix4, Vector3 } from "three";
import useIsTouch from "@/hooks/useIsTouch";
import { consumeLookDelta, isTouchMode } from "./inputStore";

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
  const isTouchDevice = true
  const touchState = useRef<{
    active: boolean;
    id: number | null;
    lastX: number;
    lastY: number;
  }>({ active: false, id: null, lastX: 0, lastY: 0 });

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

    const applyLookDelta = (dx: number, dy: number) => {
      targetRotation.current.y -= dx * sensitivity;
      targetRotation.current.x -= dy * sensitivity;

      const PI_2 = Math.PI / 2;
      targetRotation.current.x = Math.max(
        -PI_2 + 0.01,
        Math.min(PI_2 - 0.01, targetRotation.current.x)
      );
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isLocked.current || !enabled) return;

      const { movementX, movementY } = event;
      applyLookDelta(movementX, movementY);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!enabled) return;
      if (touchState.current.active) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      touchState.current = {
        active: true,
        id: touch.identifier,
        lastX: touch.clientX,
        lastY: touch.clientY,
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!enabled || !touchState.current.active) return;

      const touch = Array.from(event.changedTouches).find(
        (t) => t.identifier === touchState.current.id
      );
      if (!touch) return;

      const dx = touch.clientX - touchState.current.lastX;
      const dy = touch.clientY - touchState.current.lastY;

      touchState.current.lastX = touch.clientX;
      touchState.current.lastY = touch.clientY;

      // Invert dy to match mouse drag feel (drag up = look up)
      applyLookDelta(dx, dy);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!touchState.current.active) return;

      const touch = Array.from(event.changedTouches).find(
        (t) => t.identifier === touchState.current.id
      );
      if (!touch) return;

      touchState.current = {
        active: false,
        id: null,
        lastX: 0,
        lastY: 0,
      };
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
      if (!isLocked.current && enabled && !isTouchDevice) {
        (domElement as HTMLElement).requestPointerLock();
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    domElement.addEventListener("click", onClick);

    if (isTouchDevice) {
      const el = domElement as HTMLElement;
      el.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
      el.addEventListener("touchmove", onTouchMove as EventListener, { passive: true });
      el.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });
      el.addEventListener("touchcancel", onTouchEnd as EventListener, { passive: true });
    }

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      domElement.removeEventListener("click", onClick);
      if (isTouchDevice) {
        const el = domElement as HTMLElement;
        el.removeEventListener("touchstart", onTouchStart as EventListener);
        el.removeEventListener("touchmove", onTouchMove as EventListener);
        el.removeEventListener("touchend", onTouchEnd as EventListener);
        el.removeEventListener("touchcancel", onTouchEnd as EventListener);
      }
    };
  }, [enabled, gl.domElement, isTouchDevice, onLock, onUnlock, selector, sensitivity]);

  useFrame((state, delta) => {
    if (!enabled) return;

    // On touch devices, consume look deltas from global input store (MobileControls)
    if (isTouchDevice) {
      const { dx, dy } = consumeLookDelta();
      if (dx !== 0 || dy !== 0) {
        targetRotation.current.y -= dx * sensitivity;
        targetRotation.current.x -= dy * sensitivity;

        const PI_2 = Math.PI / 2;
        targetRotation.current.x = Math.max(
          -PI_2 + 0.01,
          Math.min(PI_2 - 0.01, targetRotation.current.x)
        );
      }
    }
    
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
