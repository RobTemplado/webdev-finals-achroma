export function Crosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
      <div className="h-3 w-3 rounded-full border border-white/60" />
    </div>
  );
}