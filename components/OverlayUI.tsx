import { Html } from "@react-three/drei";
import { ReactNode, useEffect, useState } from "react";
import * as THREE from "three";

interface OverlayUIProps {
  children: ReactNode;
  position?: THREE.Vector3;
}

export function OverlayUI({ children, position }: OverlayUIProps) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("ui-overlay-root"));
  }, []);

  if (!target) return null;

  return (
    <Html
      portal={{ current: target }}
      calculatePosition={() => [0, 0]}
      position={position || new THREE.Vector3(0, 0, 0)}
      style={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
      zIndexRange={[100, 0]} // Ensure it's on top if z-index is used
    >
      {children}
    </Html>
  );
}