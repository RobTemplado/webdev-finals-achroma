import { useGameState } from "@/store/gameState";
import { HintOverlay } from "./HintOverlay";
import { Crosshair } from "./Crosshair";
import RadioSubtitleOverlay from "@/components/RadioSubtitleOverlay";
import PointerLockOverlay from "@/components/PointerLockOverlay";

interface GameUIProps {
  isTouch: boolean
}

export function GameUI({ isTouch }: GameUIProps) {
  const { started, locked } = useGameState();

  if (!started) return null;

  return (
    <>
      <HintOverlay isTouch={isTouch} />
      <Crosshair />
      <RadioSubtitleOverlay />
      {!isTouch && !locked && <PointerLockOverlay visible={true} />}
    </>
  );
}