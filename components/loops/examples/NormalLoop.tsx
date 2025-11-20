"use client";

import { useEffect, useState } from "react";
import { StalkerMan } from "../../StalkerMan";

export default function NormalLoop() {
  const [showStalker, setShowStalker] = useState(false);

  useEffect(() => {
    // rand 1 to 10
    const randInteger = Math.floor(Math.random() * 10) + 1;
    console.log("NormalLoop: Random chance for stalker:", randInteger);
    if (randInteger < 3) {
      setShowStalker(true);
      console.log("Stalker spawned!");
    }
  }, []);

  useEffect(() => {
    // Unlock door immediately
    setTimeout(() => {
      console.log("NormalLoop: Unlocking end door.");
      window.dispatchEvent(new CustomEvent("__unlock_end_door__"));
    }, 9000);
  }, []);

  return (
    <>
      {showStalker && <StalkerMan castShadow position={[0, 0, 11]} />}
    </>
  );
}