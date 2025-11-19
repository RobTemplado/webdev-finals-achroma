"use client";

import { useDebugStore } from "@/store/debugStore";
import { Line } from "@react-three/drei";

export function DebugGizmoRenderer() {
  const shapes = useDebugStore((s) => s.shapes);

  return (
    <>
      {shapes.map((shape) => {
        if (shape.type === 'box') {
          return (
            <mesh key={shape.id} position={shape.position}>
              <boxGeometry args={shape.size} />
              <meshBasicMaterial color={shape.color} wireframe />
            </mesh>
          );
        }
        if (shape.type === 'sphere') {
          return (
            <mesh key={shape.id} position={shape.position}>
              <sphereGeometry args={[shape.radius, 16, 16]} />
              <meshBasicMaterial color={shape.color} wireframe />
            </mesh>
          );
        }
        if (shape.type === 'line') {
          return (
            <Line
              key={shape.id}
              points={[shape.start, shape.end]}
              color={shape.color}
              lineWidth={1}
            />
          );
        }
        return null;
      })}
    </>
  );
}
