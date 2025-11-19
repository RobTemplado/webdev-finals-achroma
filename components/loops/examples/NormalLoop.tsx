"use client";

import { useEffect, useState } from "react";
import { StalkerMan } from "../../StalkerMan";

export default function NormalLoop() {
  const [showStalker, setShowStalker] = useState(false);

  useEffect(() => {
    // Small chance (e.g. 20%)
    if (Math.random() < 0.2) {
      setShowStalker(true);
      console.log("Stalker spawned!");
    }
  }, []);

  useEffect(() => {
    // Unlock door immediately
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("__unlock_end_door__"));
    }, 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {showStalker && <StalkerMan castShadow position={[0, 0, 11]} />}
    </>
  );
}