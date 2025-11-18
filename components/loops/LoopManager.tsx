"use client";

import { memo } from "react";
import { getLoopComponent } from "./loopRegistry";
import { useGameState } from "@/store/gameState";
import "./examples";

function LoopManagerInner() {
  const loop = useGameState((s) => s.loop);
  const respawnKey = useGameState((s) => s.respawnKey);
  const Comp = getLoopComponent(loop);
  if (!Comp)  {
    console.warn(`No component registered for loop ${loop}`);
    return null;
  };
  return (
    <group key={`loop-${loop}-${respawnKey}`}>
      <Comp loop={loop} />
    </group>
  );
}

export const LoopManager = memo(LoopManagerInner);

export default LoopManager;
