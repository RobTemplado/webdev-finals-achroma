"use client";

import Preloader from "@/components/Preloader";
import useIsTouch from "@/hooks/useIsTouch";
import useViewportVH from "@/hooks/useViewportVH";
import SceneCanvas from "@/components/SceneCanvas";
import TitleScreen from "@/components/TitleScreen";
import { GameUI } from "@/components/game-ui/GameUI";
import { MobileUI } from "@/components/mobile/MobileUI";
import { useGameState } from "@/store/gameState";

export default function Home() {
  const isTouch = useIsTouch();
  const { flashOn, started, setStarted, setLocked } = useGameState();

  useViewportVH();

  return (
    <div
      className="fixed inset-0 w-full select-none"
      style={{ height: "calc(var(--vh, 1vh) * 100)" }}
    >
      <SceneCanvas
        isTouch={isTouch}
        flashOn={flashOn}
        started={started}
        onPointerLockChange={(v) => {
          console.log("[page.tsx] pointer lock change:", v);
          setLocked(v);
        }}
      />
      {!started && <Preloader />}
      <TitleScreen started={started} onStart={() => setStarted(true)} />
      
      <GameUI isTouch={isTouch} />
      {isTouch && <MobileUI />}
    </div>
  );
}
