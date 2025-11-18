"use client";

import { useGameState } from "@/store/gameState";
import React, { useEffect, useState } from "react";

interface TitleScreenProps {
  onStart?: () => void;
}

export default function TitleScreen({ onStart }: TitleScreenProps) {
  const [isStarting, setIsStarting] = useState(false);

  const loop = useGameState((s) => s.loop);
  const setLoop = useGameState((s) => s.setLoop);

  const handleStart = () => {
    if (isStarting) return;

    setIsStarting(true);

    if (loop === -1) {
      setLoop(0);
    }

    onStart?.();
  };

  useEffect(() => {
    console.log("[TitleScreen] mounted");
  }, []);

  return (
    <div
      onClick={handleStart}
      className={`absolute left-0 top-0 z-[70] h-screen w-full overflow-hidden bg-black font-mono text-gray-300 transition-colors duration-75 cursor-pointer ${
        isStarting ? "bg-red-950" : ""
      }`}
    >
      {/* 1. Noise Layer */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.12] mix-blend-overlay">
        <div
          className="h-[200%] w-[200%] animate-noise bg-repeat"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* 2. Scanlines */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-scanlines bg-[length:100%_3px] opacity-60" />

      {/* 3. Vignette */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-radial-vignette" />

      {/* --- Flash Effect on Click --- */}
      <div
        className={`pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-[2000ms] ${
          isStarting ? "opacity-0" : "opacity-0"
        }`}
        style={{
          opacity: isStarting ? 0 : 0,
          animation: isStarting ? "flash 0.1s forwards" : "none",
        }}
      />
      <style jsx>{`
        @keyframes flash {
          0% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>

      {/* --- Content --- */}
      <div className="relative z-30 flex h-full flex-col items-center justify-center">
        {/* Main Title */}
        <div
          className={`flex flex-col items-center transition-all duration-1000 ${
            isStarting ? "scale-105 blur-sm opacity-0" : "scale-100 opacity-100"
          }`}
        >
          <h1 className="relative text-6xl md:text-9xl font-bold tracking-[0.2em] uppercase text-white mix-blend-difference">
            Achroma
            {/* Subtle red shadow/ghost */}
            <span className="absolute left-1 top-0 -z-10 text-red-900 opacity-60 blur-[1px]">
              Achroma
            </span>
          </h1>

          <div className="mt-2 h-[1px] w-32 bg-red-900/50" />
        </div>

        {/* "Click to Start" Prompt */}
        <div className="absolute bottom-24 flex flex-col items-center gap-4">
          {/* The prompt itself */}
          <p
            className={`text-sm md:text-base tracking-[0.4em] uppercase text-gray-500 transition-all duration-300 ${
              isStarting
                ? "text-red-500 font-bold translate-y-1"
                : "animate-pulse"
            }`}
          >
            {isStarting ? "Run." : "Press any key to start"}
          </p>

          {/* Decor element */}
          <div
            className={`h-1 w-1 rounded-full bg-red-700 transition-opacity duration-500 ${
              isStarting ? "opacity-0" : "opacity-50"
            }`}
          />
        </div>

        {/* Corner Version Number */}
        <div className="absolute bottom-4 right-6 text-[10px] text-gray-800 tracking-widest font-thin select-none">
          v0.0.1 ALPHA
        </div>
      </div>
    </div>
  );
}
