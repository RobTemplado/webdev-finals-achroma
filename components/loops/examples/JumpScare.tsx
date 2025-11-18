import dynamic from "next/dynamic";
import { registerLoop } from "../loopRegistry";
import Man from "@/components/Man";
import { StalkerMan } from "@/components/StalkerMan";

export default function JumpScare() {
  return (
    <>
    {/* position={[-11.7, 1.25, -0.15]} rotation={[0, Math.PI / 2, 0]} */}
      <StalkerMan position={[0, 0, 11]}  castShadow />
    </>
  );
}

// registerLoop(0, JumpScare);
