"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { setMoveAxes, setTouchMode } from "./inputStore";

// Utility: detect touch-capable device once on mount
function useIsTouch(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const isTouch =
      "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
    setTouch(isTouch);
  }, []);
  return touch;
}

export default function MobileControls() {
  const isTouch = useIsTouch();
  const [visible, setVisible] = useState(false);
  const [movedOnce, setMovedOnce] = useState(false);
  const [hintsVisible, setHintsVisible] = useState(false);
  const [hintsFade, setHintsFade] = useState(false);

  useEffect(() => {
    setVisible(isTouch);
    setTouchMode(isTouch);
    if (!isTouch) {
      // ensure axes are zeroed when leaving touch mode
      setMoveAxes(0, 0);
    }
  }, [isTouch]);

  // Show hints only once per session (persist across reloads)
  useEffect(() => {
    if (!isTouch) return;
    try {
      const dismissed = localStorage.getItem("touchHintsDismissed");
      if (dismissed === "1") setHintsVisible(false);
    } catch {}
  }, [isTouch]);

  useEffect(() => {
    if (!hintsVisible) return;
    if (movedOnce) {
      setHintsFade(true);
      const t = setTimeout(() => {
        setHintsVisible(false);
        try {
          localStorage.setItem("touchHintsDismissed", "1");
        } catch {}
      }, 600);
      return () => clearTimeout(t);
    }
  }, [movedOnce, hintsVisible]);

  // Left joystick state
  const leftId = useRef<number | null>(null);
  const leftCenter = useRef<{ x: number; y: number } | null>(null);
  const stickRef = useRef<HTMLDivElement | null>(null);

  // Config
  const maxRadius = 60; // px
  const deadZone = 8; // px
  const preventGestures = (e: React.TouchEvent)  => {
    // only on 
  }

  // Left area handlers (movement)
  const onLeftTouchStart = (e: React.TouchEvent) => {
    // Prevent page gestures on iOS
 
    if (leftId.current != null) return;
    const t = e.changedTouches[0];
    leftId.current = t.identifier;
    leftCenter.current = { x: t.clientX, y: t.clientY };
    updateStickVisual(0, 0);
  };
  const onLeftTouchMove = (e: React.TouchEvent) => {
    preventGestures(e);
    e.stopPropagation();
    if (leftId.current == null || !leftCenter.current) return;
    const t = getTouchById(e, leftId.current);
    if (!t) return;
    const dx = t.clientX - leftCenter.current.x;
    const dy = t.clientY - leftCenter.current.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const clamped = Math.min(dist, maxRadius);
    const nx = (clamped * Math.cos(angle)) / maxRadius; // -1..1
    const ny = (clamped * Math.sin(angle)) / maxRadius; // -1..1
    // dead zone
    const dead = Math.min(1, dist / Math.max(1, deadZone));
    const moveX = nx * dead; // strafe
    const moveY = -ny * dead; // forward is up (negative screen y)
    setMoveAxes(moveX, moveY);
    updateStickVisual(nx * maxRadius, ny * maxRadius);
    if (!movedOnce && dist > deadZone * 1.25) setMovedOnce(true);
  };
  const onLeftTouchEnd = (e: React.TouchEvent) => {
    preventGestures(e);
    e.stopPropagation();
    const id = leftId.current;
    if (id == null) return;
    const t = getTouchById(e, id);
    if (!t) return;
    leftId.current = null;
    leftCenter.current = null;
    setMoveAxes(0, 0);
    updateStickVisual(0, 0);
  };

  function updateStickVisual(dx: number, dy: number) {
    const el = stickRef.current;
    if (!el) return;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  const ui = useMemo(
    () => (
      <>
        {/* Left: movement joystick (higher z) */}
        <div
          className="pointer-events-auto absolute left-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0.5rem))] h-36 w-36 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 touch-none select-none z-20"
          onTouchStart={onLeftTouchStart}
          onTouchMove={onLeftTouchMove}
          onTouchEnd={onLeftTouchEnd}
          onTouchCancel={onLeftTouchEnd}
        >
          <div className="relative h-full w-full grid place-items-center">
            <div
              className="h-6 w-6 rounded-full bg-white/50"
              ref={stickRef}
              style={{ transform: "translate(0,0)" }}
            />
          </div>
        </div>

        {/* Onboarding hints overlay */}
        {true && (
          <div
            className={`pointer-events-none absolute inset-0 z-[25] transition-opacity duration-500 ${
              hintsFade ? "opacity-0" : "opacity-100"
            }`}
          >
            {/* Dim corners slightly to hint UI */}
            <div className="absolute left-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0.5rem))] h-36 w-36 rounded-full border-2 border-white/20" />
            <div className="absolute left-5 bottom-[max(8rem,calc(env(safe-area-inset-bottom,0.5rem)+6rem))] text-xs text-white/70 max-w-[50vw]">
              Use this joystick to move
            </div>
          </div>
        )}
      </>
    ),
    [hintsVisible, hintsFade]
  );

  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 mobile-controls">
      {ui}
    </div>
  );
}

type TouchLike = { identifier: number; clientX: number; clientY: number };
function getTouchById(e: React.TouchEvent, id: number): TouchLike | null {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t: any = e.changedTouches.item(i);
    if (t && t.identifier === id) return t;
  }
  return null;
}
