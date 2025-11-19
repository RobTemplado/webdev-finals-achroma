import { useEffect } from "react";
import { FALLEN_STUFF } from "./Loop0";
import { useThree } from "@react-three/fiber";

export default function FallenObjectsLoop() {
    const { scene } = useThree();

    useEffect(() => {
        FALLEN_STUFF.forEach((objName) => {
            const obj = scene.getObjectByName(objName);
            if (obj) {
                obj.visible = true;
            } else {
                console.warn(`FallenObjectsLoop: Object ${objName} not found in scene.`);
            }
        });
    }, []);
    
    useEffect(() => {
        // Unlock door immediately
        const t = setTimeout(() => {
            window.dispatchEvent(new CustomEvent("__unlock_end_door__"));
        }, 100);
        return () => clearTimeout(t);
    }, []);

    return null;
}