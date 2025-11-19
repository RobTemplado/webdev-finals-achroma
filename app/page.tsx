"use client";

import useIsTouch from "@/hooks/useIsTouch";
import useViewportVH from "@/hooks/useViewportVH";
import SceneCanvas from "@/components/SceneCanvas";
import { GlobalDebugConsoleOverlay } from "@/components/GlobalDebugConsoleOverlay";
import { useSearchParams } from "next/navigation";
import { GameUI } from "@/components/game-ui/GameUI";
import { Preloader } from "@/components/Preloader";
import { MobileUI } from "@/components/mobile/MobileUI";
import { useGameState } from "@/store/gameState";
import { Suspense, useEffect, useState } from "react";
import TitleScreen from "@/components/TitleScreen";

import "@/components/loops/examples/index"

export default function Page() {
  return (
    <Suspense fallback={<Preloader />}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const isTouch = useIsTouch();
  const { flashOn, started, setStarted, setLocked, setLoop } = useGameState();
  const params = useSearchParams();
  const editor = (params.get("editor") ?? "") !== ""; // any value enables
  const showConsole = (params.get("showConsole") ?? "") !== "";
  const [showTitle, setShowTitle] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    const debugLoopParam = params.get("debugLoop");
    if (debugLoopParam == null) return;
    const parsed = Number.parseInt(debugLoopParam, 10);
    if (Number.isNaN(parsed)) return;
    setLoop(parsed);
  }, [params, setLoop]);

  useViewportVH();

  return (
    <div
      className="fixed inset-0 w-full select-none"
      style={{ height: "calc(var(--vh, 1vh) * 100)" }}
    >
      {/* 3D scene */}
      <SceneCanvas
        isTouch={isTouch}
        flashOn={flashOn}
        started={started}
        onFirstFrameReady={() => {
          setSceneReady(true);
          setShowTitle(true);
        }}
        onPointerLockChange={(v) => {
          console.log("[page.tsx] pointer lock change:", v);
          setLocked(v);
        }}
        editor={editor}
      />

      {/* Title screen overlay is shown only after scene is ready */}
      {!editor && showTitle && (
        <TitleScreen onStart={() => { setStarted(true); setShowTitle(false); }} />
      )}

      {!editor && !showTitle && sceneReady && <GameUI isTouch={isTouch} />} 
      {!editor && !showTitle && sceneReady && isTouch && <MobileUI />}

      {showConsole && <GlobalDebugConsoleOverlay />}
    </div>
  );
}
