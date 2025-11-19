"use client";

import React, { useState, useEffect } from "react";

const LOADING_PHRASES = [
  "Loading corridor loop...",
  "Checking visual cortex...",
  "Don't look behind you.",
  "Manifesting fears...",
  "204863",
  "Listening for breathing...",
  "If the screen freezes, it's not a bug.",
  "Do not trust the radio.",
];

export function Preloader() {
  const [progress, setProgress] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);

  // Simulate loading with irregular intervals (psychological horror pacing)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const advanceProgress = () => {
      setProgress((prev) => {
        // Fast start
        if (prev < 30) return prev + Math.random() * 2;
        // Slow middle
        if (prev < 70) return prev + Math.random() * 0.5;
        // Agonizing finish (stalls at 99%)
        if (prev < 99) return prev + Math.random() * 0.1;
        return prev;
      });

      // Randomize tick speed to feel "broken" or "struggling"
      const nextTick = Math.random() * 200 + (progress > 80 ? 300 : 50);
      timeoutId = setTimeout(advanceProgress, nextTick);
    };

    advanceProgress();
    return () => clearTimeout(timeoutId);
  }, []);

  // Cycle phrases based on progress
  useEffect(() => {
    if (progress > 20 && progress < 40) setPhraseIndex(1);
    else if (progress > 40 && progress < 60) setPhraseIndex(2);
    else if (progress > 60 && progress < 80) setPhraseIndex(3);
    else if (progress > 80 && progress < 90) setPhraseIndex(4);
    else if (progress > 90) setPhraseIndex(Math.floor(Math.random() * (LOADING_PHRASES.length - 5) + 5));
  }, [progress]);

  // Random Glitch Effect Trigger
  useEffect(() => {
    // const triggerGlitch = () => {
    //   setIsGlitching(true);
    //   setTimeout(() => setIsGlitching(false), Math.random() * 200 + 50);
    //   setTimeout(triggerGlitch, Math.random() * 5000 + 2000);
    // };
    // triggerGlitch();
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black font-mono text-gray-300 selection:bg-red-900 selection:text-white">
      {/* --- CSS Effects for Noise & Scanlines --- */}
      <style jsx global>{`
        @keyframes noise {
          0% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -5%); }
          20% { transform: translate(-10%, 5%); }
          30% { transform: translate(5%, -10%); }
          40% { transform: translate(-5%, 15%); }
          50% { transform: translate(-10%, 5%); }
          60% { transform: translate(15%, 0); }
          70% { transform: translate(0, 10%); }
          80% { transform: translate(-15%, 0); }
          90% { transform: translate(10%, 5%); }
          100% { transform: translate(5%, 0); }
        }
        .animate-noise {
          animation: noise 0.2s steps(3) infinite;
        }
        .glitch-text {
          text-shadow: 2px 0 rgba(255,0,0,0.5), -2px 0 rgba(0,0,255,0.5);
        }
      `}</style>

      {/* --- Background Layers --- */}
      
      {/* 1. Static Noise Layer (The Grain) */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.15] mix-blend-overlay">
        <div 
            className="h-[200%] w-[200%] animate-noise bg-repeat"
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`
            }}
        />
      </div>

      {/* 2. CRT Scanlines */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] bg-repeat" />

      {/* 3. Heavy Vignette (The Darkness) */}
      <div className="pointer-events-none absolute inset-0 z-20 bg-radial-gradient-vignette" 
           style={{ background: 'radial-gradient(circle, transparent 40%, black 120%)' }} 
      />

      {/* --- Main Content --- */}
      <div className="relative z-30 flex h-full flex-col items-center justify-center p-4">
        
        {/* Container */}
        <div className={`relative flex max-w-md flex-col items-center transition-opacity duration-100 ${isGlitching ? 'opacity-80 translate-x-1' : 'opacity-100'}`}>
          
          {/* Title Section */}
          <div className="relative mb-12">
            <h1 className={`text-5xl md:text-7xl font-bold tracking-[0.5em] uppercase text-white mix-blend-difference ${isGlitching ? 'glitch-text blur-[1px]' : ''}`}>
              Achroma
            </h1>
            
            {/* Ghost Title (for that blurry double-vision look) */}
            <span className="absolute inset-0 -z-10 animate-pulse text-5xl md:text-7xl font-bold tracking-[0.5em] uppercase text-red-600 opacity-40 blur-sm">
              Achroma
            </span>
          </div>

          {/* Loading Bar Container */}
          <div className="relative mb-4 h-[1px] w-64 bg-gray-800">
            {/* The Bar */}
            <div 
              className="absolute left-0 top-0 h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
            
            {/* Red Blip at the end of the bar */}
            <div 
                className="absolute top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-red-600 blur-[2px]"
                style={{ left: `${progress}%`, opacity: progress > 0 ? 1 : 0 }}
            />
          </div>

          {/* Dynamic Status Text */}
          <div className="flex h-16 flex-col items-center justify-start space-y-2 text-center">
            <p className="text-xs font-light tracking-[0.3em] text-gray-400 uppercase">
              {LOADING_PHRASES[phraseIndex]}
            </p>
            
            {/* Percentage - Occasional Glitch */}
            <p className="text-[10px] text-red-900/80 font-bold tracking-widest">
               {isGlitching ? 'ERR' : `${Math.floor(progress)}%`}
            </p>
          </div>

        </div>

        {/* Bottom Warning - P.T. style legal/warning text */}
        <div className="absolute bottom-8 text-center opacity-30">
            <p className="text-[9px] uppercase tracking-widest max-w-xs leading-relaxed">
                Automatic data restoration in progress. <br/>
                Do not turn off the console.
            </p>
        </div>
      </div>
    </div>
  );
}