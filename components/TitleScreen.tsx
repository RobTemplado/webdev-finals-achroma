"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";

export default function TitleScreen({
  started,
  onStart,
}: {
  started: boolean;
  onStart: () => void;
}) {
  const { active, progress, loaded, total } = useProgress();
  const [visible, setVisible] = useState(false);
  const [fade, setFade] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const invokedRef = useRef(false);

  const done = useMemo(
    () => !active && (progress >= 100 || (loaded > 0 && loaded >= total)),
    [active, progress, loaded, total]
  );

  // Show when loading done and not yet started
  useEffect(() => {
    if (done && !started) setVisible(true);
  }, [done, started]);

  // Hide on start with a small fade
  useEffect(() => {
    if (started && visible) {
      setFade(true);
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [started, visible]);

  // Focus the overlay for keyboard "any key" start
  useEffect(() => {
    if (visible) rootRef.current?.focus();
  }, [visible]);

  if (!visible) return null;
  const handleStart = () => {
    if (invokedRef.current) return;
    invokedRef.current = true;
    // Attempt pointer lock on desktop to jump straight in
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0);
    if (!isTouch) {
      const el = document.getElementById("r3f-canvas") as any;
      el?.requestPointerLock?.();
    }
    onStart();
  };

  const onKeyDown = () => handleStart();

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-label="Tap anywhere to play"
      onPointerDown={handleStart}
      onKeyDown={onKeyDown}
      className={`fixed inset-0 z-[70] overflow-hidden bg-black ${
        fade ? "opacity-0 transition-opacity duration-300" : "opacity-100"
      }`}
    >
      {/* Background layers */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Subtle moving fog/noise via SVG turbulence and jitter */}
        <div className="absolute inset-0 mix-blend-screen opacity-[0.04] will-change-transform animate-grain" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.6)_60%,rgba(0,0,0,0.95)_100%)]" />
        {/* Scanlines */}
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,rgba(0,0,0,0)_2px)] bg-[length:100%_2px]" />
      </div>

      {/* Center content */}
      <div className="relative z-10 grid h-full place-items-center select-none text-white">
        <div className="relative mx-auto w-[min(760px,92vw)] p-6 text-center">
          <h1 className="title-glitch mb-4 text-[14vw] leading-none sm:text-7xl font-semibold tracking-[0.35em] text-white">
            ACHROMA
          </h1>
          <p className="mx-auto mb-10 max-w-[60ch] text-sm text-white/70 animate-fadein [animation-delay:600ms]">
            A quiet corridor. The lights flicker. Headphones recommended.
          </p>

          <div className="mx-auto w-max">
            <div className="relative inline-block">
              <span className="pointer-events-none block select-none text-xs tracking-[0.35em] text-white/80 animate-blink uppercase">
                Tap or press any key to play
              </span>
              {/* Duplicate for subtle shadow */}
              <span
                aria-hidden
                className="absolute inset-0 -translate-y-[1px] translate-x-[1px] text-xs tracking-[0.35em] text-white/10"
              >
                Tap or press any key to play
              </span>
            </div>
          </div>

          <div className="mt-7 text-[11px] text-white/45 animate-fadein [animation-delay:900ms]">
            WASD to move · Mouse to look · Esc to unlock
          </div>
        </div>
      </div>

      {/* Ambient top light bar flicker */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_100%)] animate-flicker" />

      {/* Component-scoped styles for effects */}
      <style jsx>{`
        @keyframes grainMove {
          0% {
            transform: translate3d(0, 0, 0) scale(1.02);
          }
          10% {
            transform: translate3d(-1%, 1%, 0) scale(1.02);
          }
          20% {
            transform: translate3d(1%, -0.5%, 0) scale(1.02);
          }
          30% {
            transform: translate3d(-0.5%, -1%, 0) scale(1.02);
          }
          40% {
            transform: translate3d(0.5%, 1%, 0) scale(1.02);
          }
          50% {
            transform: translate3d(1%, 0.5%, 0) scale(1.02);
          }
          60% {
            transform: translate3d(-1%, -0.5%, 0) scale(1.02);
          }
          70% {
            transform: translate3d(0.5%, -1%, 0) scale(1.02);
          }
          80% {
            transform: translate3d(-0.5%, 0.5%, 0) scale(1.02);
          }
          90% {
            transform: translate3d(0.2%, -0.2%, 0) scale(1.02);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1.02);
          }
        }
        .animate-grain {
          background-image: url("data:image/svg+xml;utf8,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
              <filter id='n'>
                <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
              </filter>
              <rect width='120' height='120' filter='url(%23n)'/>
            </svg>`
          )}");
          background-size: 320px 320px;
          image-rendering: pixelated;
          animation: grainMove 8s steps(10, end) infinite;
        }

        @keyframes flicker {
          0%,
          100% {
            opacity: 1;
          }
          92% {
            opacity: 0.9;
          }
          94% {
            opacity: 0.6;
          }
          96% {
            opacity: 0.95;
          }
          98% {
            opacity: 0.75;
          }
        }
        .animate-flicker {
          animation: flicker 7s infinite;
        }

        @keyframes blink {
          0%,
          70% {
            opacity: 0;
          }
          71%,
          90% {
            opacity: 1;
          }
          91%,
          100% {
            opacity: 0;
          }
        }
        .animate-blink {
          animation: blink 2.4s steps(2, end) infinite;
        }

        @keyframes titleGlitch {
          0% {
            text-shadow: 0 0 0 rgba(255, 255, 255, 0.2);
            filter: blur(0);
          }
          8% {
            text-shadow: 2px 0 2px rgba(255, 0, 0, 0.15),
              -2px 0 2px rgba(0, 200, 255, 0.15);
          }
          9% {
            text-shadow: -1px 0 1px rgba(255, 0, 0, 0.2),
              1px 0 1px rgba(0, 200, 255, 0.2);
            filter: blur(0.3px);
          }
          10% {
            text-shadow: 0 0 0 rgba(255, 255, 255, 0.2);
            filter: blur(0);
          }
          60% {
            opacity: 0.98;
          }
          62% {
            opacity: 1;
          }
        }
        .title-glitch {
          text-transform: uppercase;
          animation: titleGlitch 5.5s ease-in-out infinite;
          letter-spacing: 0.35em;
        }

        @keyframes fadein {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadein {
          animation: fadein 800ms ease forwards;
        }

        /* Respect reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .animate-grain,
          .animate-flicker,
          .animate-blink,
          .title-glitch,
          .animate-fadein {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
