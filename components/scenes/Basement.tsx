import { useGLTF } from "@react-three/drei";
import { ThreeElements } from "@react-three/fiber";
import useBasementDoor from "./useBasementDoor";

export default function Basement(props: ThreeElements["group"]) {
  const url = "/optimized/basement.glb";

  const gltf = useGLTF(url, true);

  useBasementDoor(gltf.scene);

  return (
    <group {...props}>
      <primitive object={gltf.scene} />
    </group>
  );
}

useGLTF.preload("/optimized/basement.glb");
