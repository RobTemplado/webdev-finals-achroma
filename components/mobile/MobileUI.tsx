import MobileControls from "@/components/MobileControls";
import TouchDebug from "@/components/TouchDebug";
import { useGameState } from "@/store/gameState";

export function MobileUI() {
  const { started, toggleFlashlight } = useGameState();

  if (!started) return null;

  return (
    <>
      <MobileControls />
      <TouchDebug />
    </>
  );
}