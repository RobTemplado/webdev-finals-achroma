interface HintOverlayProps {
  isTouch: boolean
}

export function HintOverlay({ isTouch }: HintOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-10 grid place-items-center text-xs text-white/80">
      {isTouch ? (
        <p>Use left joystick to move · drag anywhere to look</p>
      ) : (
        <p>Click the canvas to lock pointer · WASD to move · Esc to unlock</p>
      )}
    </div>
  );
}