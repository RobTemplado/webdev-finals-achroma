import { useGameState } from "@/store/gameState";
import { HintOverlay } from "./HintOverlay";
import { Crosshair } from "./Crosshair";
import RadioSubtitleOverlay from "@/components/RadioSubtitleOverlay";
import PointerLockOverlay from "@/components/PointerLockOverlay";

interface GameUIProps {
  isTouch: boolean
}

export function GameUI({ isTouch }: GameUIProps) {
  const { started, locked, loop, isDead } = useGameState();

  if (!started) return null;

  return (
    <>
      {/* Death Overlay */}
      <div
        className="fixed inset-0 z-[100] bg-black pointer-events-none transition-opacity duration-[2000ms]"
        style={{ opacity: isDead ? 1 : 0 }}
      />

      <div className="fixed top-2 left-2 z-50 text-white/70 select-none text-sm pointer-events-none">
        Loop: {loop}
      </div>
      <HintOverlay isTouch={isTouch} />
      <Crosshair />
      <RadioSubtitleOverlay />
      {!isTouch && !locked && <PointerLockOverlay visible={true} />}
      
      {/* Root for R3F Html Portals */}
      <div id="ui-overlay-root" className="fixed inset-0 z-[60] pointer-events-none" style={{ display: 'grid', placeItems: 'center' }}></div>
    </>
  );
}