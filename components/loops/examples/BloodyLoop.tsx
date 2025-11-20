import { useEffect } from "react";
import { BLOOD_SPLATTERS } from "./Loop0";
import { useThree } from "@react-three/fiber";

export default function BloodyLoop() {
  const { scene } = useThree();

  useEffect(() => {
     BLOOD_SPLATTERS.forEach((objName) => {
        const obj = scene.getObjectByName(objName);
        if (obj) {
          obj.visible = true;
        } else {
          console.warn(
            `FallenObjectsLoop: Object ${objName} not found in scene.`
          );
        }
      });

    setTimeout(() => {
      setTimeout(() => {
            window.dispatchEvent(new CustomEvent("__unlock_end_door__"));
        }, 2000);
    }, 9000);
  }, []);

  return null;
}
