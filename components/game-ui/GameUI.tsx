import { useGameState } from "@/store/gameState";
import { HintOverlay } from "./HintOverlay";
import { Crosshair } from "./Crosshair";
import RadioSubtitleOverlay from "@/components/RadioSubtitleOverlay";
import PointerLockOverlay from "@/components/PointerLockOverlay";

interface GameUIProps {
  isTouch: boolean
}

export function GameUI({ isTouch }: GameUIProps) {
  const { started, locked, loop } = useGameState();

  if (!started) return null;

  return (
    <>
      <div className="fixed top-2 left-2 z-50 text-white/70 select-none text-sm pointer-events-none">
        Loop: {loop}
      </div>
      <HintOverlay isTouch={isTouch} />
      <Crosshair />
      <RadioSubtitleOverlay />
      {!isTouch && !locked && <PointerLockOverlay visible={true} />}
    </>
  );
}