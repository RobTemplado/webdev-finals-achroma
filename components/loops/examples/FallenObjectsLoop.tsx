import { useEffect } from "react";
import { FALLEN_STUFF } from "./Loop0";
import { useThree } from "@react-three/fiber";

export default function FallenObjectsLoop() {
    const { scene } = useThree();

    useEffect(() => {
        console.log("FallenObjectsLoop: Making fallen objects visible.");
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
        setTimeout(() => {
            console.log("FallenObjectsLoop: Unlocking end door.");
            window.dispatchEvent(new CustomEvent("__unlock_end_door__"));
        }, 12000);
    
    }, []);

    return null;
}