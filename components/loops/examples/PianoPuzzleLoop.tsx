"use client";

import React, { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Music, Skull, Volume2 } from "lucide-react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useGameState } from "@/store/gameState";
import { useSound } from "@/components/audio/useSound";
import { OverlayUI } from "@/components/OverlayUI";
import { consumeInteract } from "@/components/inputStore";
import { showSubtitle } from "@/hooks/useSubtitle";

// --- Constants ---

const NOTES = [
  { note: "C", type: "white", freq: 261.63 },
  { note: "C#", type: "black", freq: 277.18 },
  { note: "D", type: "white", freq: 293.66 },
  { note: "D#", type: "black", freq: 311.13 },
  { note: "E", type: "white", freq: 329.63 },
  { note: "F", type: "white", freq: 349.23 },
  { note: "F#", type: "black", freq: 369.99 },
  { note: "G", type: "white", freq: 392.0 },
  { note: "G#", type: "black", freq: 415.3 },
  { note: "A", type: "white", freq: 440.0 },
  { note: "A#", type: "black", freq: 466.16 },
  { note: "B", type: "white", freq: 493.88 },
  { note: "C2", type: "white", freq: 523.25 }, // High C
];

// The haunting melody (P.T. / Halloween vibe)
const SEQUENCE = ["F#", "F", "F#", "C", "A#"];

const SANITY_MAX = 100;
const SANITY_DRAIN = 2.5; // Moderate drain
const SANITY_PENALTY = 15; // Big hit for wrong notes

// --- Audio Engine ---
class PianoAudio {
  ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playTone(freq: number) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 1.5);
  }

  playDiscord(freq: number) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.linearRampToValueAtTime(freq - 50, t + 0.5);

    osc2.type = "square";
    osc2.frequency.setValueAtTime(freq + 10, t);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.5);
    osc2.stop(t + 0.5);
  }

  playWinChord() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    this.playTone(138.59); // low C#
    setTimeout(() => this.playTone(196.0), 400);
    setTimeout(() => this.playTone(277.18), 800);
    setTimeout(() => this.playTone(392.0), 1200);
    setTimeout(() => this.playTone(554.37), 1600);

    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = "sawtooth";
    bassOsc.frequency.setValueAtTime(50, t);
    bassOsc.frequency.linearRampToValueAtTime(30, t + 4);
    bassGain.gain.setValueAtTime(0.2, t);
    bassGain.gain.linearRampToValueAtTime(0, t + 4);

    bassOsc.connect(bassGain);
    bassGain.connect(this.ctx.destination);
    bassOsc.start(t);
    bassOsc.stop(t + 4);
  }
}

const audio = new PianoAudio();

export default function PianoPuzzleLoop() {
  const { sound } = useSound();
  const { scene, camera } = useThree();
  const setLocked = useGameState((s) => s.setLocked);
  const incrementLoop = useGameState((s) => s.incrementLoop);

  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [finished, setFinished] = useState(false);
  const [canInteract, setCanInteract] = useState(false);
  const [pianoPos, setPianoPos] = useState<THREE.Vector3 | null>(null);

  const [gameState, setGameState] = useState<"PLAYING" | "WON" | "LOST">(
    "PLAYING"
  );
  const [sanity, setSanity] = useState(SANITY_MAX);
  const [isFocusing, setIsFocusing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [shake, setShake] = useState(0);
  const [hallucinationText, setHallucinationText] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const pianoRef = useRef<THREE.Object3D | null>(null);
  const sequenceRef = useRef(SEQUENCE);


  // 1. Attach to Piano object
  useEffect(() => {
    const piano = scene.getObjectByName("Piano");
    if (piano) {
      pianoRef.current = piano;
      const pos = new THREE.Vector3();
      piano.getWorldPosition(pos);
      pos.y += 1.2;
      setPianoPos(pos);
    }

    showSubtitle("Find and play the piano", { lineDurationMs: 9000});
  }, [scene]);

  // 2. Raycast to see if player is looking at piano
  useFrame(() => {
    if (started || !pianoRef.current) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObject(pianoRef.current, true);
    const isLooking =  intersects.length > 0 && intersects[0].distance < 3;

    if (isLooking !== canInteract) setCanInteract(isLooking);

    if (isLooking && consumeInteract()) {
      setStarted(true);
    }
  });

  // 3. Also allow click to start when looking at piano
  useEffect(() => {
    if (started) return;

    const handleClick = () => {
        if (!canInteract) return;
        setStarted(true);
    //   if (canInteract) setStarted(true);
        // get id ui-overlay-root
        setTimeout(() => {
              const overlay = document.getElementById("ui-overlay-root");
        if (!overlay) {
            console.warn("No overlay root found");
            return;
        };

        const firstChild = overlay.firstChild as HTMLElement;
        if (!firstChild) {
            console.warn("No first child found in overlay root");
            return;
        }

        // style to visible
        firstChild.style.display = "block";
        }, 500 )
    };

  

    window.addEventListener("mousedown", handleClick);
 
    return () => {
      window.removeEventListener("mousedown", handleClick);
    
    };
  }, [started, canInteract]);

  // 4. When started, show UI, unlock pointer, init audio
  useEffect(() => {
    if (!started) return;

    audio.init();
    sound.resume();
    setLocked(false);

    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [started, setLocked, sound]);

  // 5. Sanity / hallucination loop
  useEffect(() => {
    if (!started || gameState !== "PLAYING") return;

    const id = setInterval(() => {
      setSanity((prev) => {
        if (isFocusing) {
          const next = prev - SANITY_DRAIN;
          if (Math.random() > 0.9 && !feedbackMessage) {
            const words = [
              "DON'T PLAY",
              "LISTEN",
              "BEHIND YOU",
              "IT HURTS",
              "F# F# F#",
            ];
            setHallucinationText(
              words[Math.floor(Math.random() * words.length)]
            );
          }
          if (next <= 0) {
            setGameState("LOST");
            return 0;
          }
          return next;
        } else {
          setHallucinationText("");
          return Math.min(SANITY_MAX, prev + 0.5);
        }
      });
    }, 100);

    return () => clearInterval(id);
  }, [started, gameState, isFocusing, feedbackMessage]);

  // 6. Handle win/lose fade and loop advance
  useEffect(() => {
    if (gameState === "LOST") {
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setStarted(false);
          setLocked(true);
          setGameState("PLAYING");
          setSanity(SANITY_MAX);
          setProgress(0);
        }, 800);
      }, 800);
      return () => clearTimeout(t);
    }

    if (gameState === "WON") {
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setFinished(true);
          setLocked(true);
            
        //   unlock door end
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent("__unlock_end_door__"));
            }, 1000);
        }, 1500);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [gameState, setLocked, incrementLoop]);

  // --- Piano key interaction ---
  const handleKeyPress = (note: string, freq: number) => {
    if (gameState !== "PLAYING" || feedbackMessage) return;

    const expected = sequenceRef.current[progress];
    if (note === expected) {
      audio.playTone(freq);
      const next = progress + 1;
      setProgress(next);
      if (next === sequenceRef.current.length) {
        setGameState("WON");
        audio.playWinChord();
      }
    } else {
      audio.playDiscord(freq);
      setSanity((prev) => Math.max(0, prev - SANITY_PENALTY));
      setShake(10);
      setFeedbackMessage("MISTAKE - SEQUENCE RESET");
      setTimeout(() => {
        setShake(0);
        setFeedbackMessage("");
      }, 1000);
      setProgress(0);
    }
  };

  if (finished) return null;

  // World hint when not started
  if (!started) {
    return (
      <>
        {canInteract && pianoPos && (
          <Html position={pianoPos} center>
            <div className="pointer-events-none text-white text-xs font-mono tracking-widest bg-black/50 px-2 py-1 backdrop-blur-sm border border-white/20">
              PLAY PIANO
            </div>
          </Html>
        )}
      </>
    );
  }

  // Puzzle UI overlay
  return (
    <OverlayUI>
      <div
        className={`$ {!visible ? "-z-100" : ""} w-full h-full bg-stone-950 overflow-hidden relative flex flex-col items-center justify-center select-none touch-none font-mono transition-opacity duration-500 ${
          visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onKeyDown={(e) =>
          e.code === "Space" && gameState === "PLAYING" && setIsFocusing(true)
        }
        onKeyUp={(e) => e.code === "Space" && setIsFocusing(false)}
        tabIndex={0}
      >
        {/* Global filters */}
        <div className="absolute inset-0 pointer-events-none z-50 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-multiply" />
        <div
          className="absolute inset-0 pointer-events-none z-50"
          style={{
            background:
              "radial-gradient(circle, transparent 20%, #0c0a09 90%)",
          }}
        />

        {/* Focus filter */}
        <div
          className="absolute inset-0 pointer-events-none z-40 transition-all duration-200"
          style={{
            backdropFilter: isFocusing
              ? "grayscale(0%) sepia(0%) contrast(1.5) saturate(2)"
              : "grayscale(100%) contrast(0.8) sepia(20%)",
            backgroundColor: isFocusing ? "rgba(50,0,0,0.1)" : "transparent",
          }}
        />

        {/* Sanity bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-stone-900 z-50">
          <div
            className={`h-full transition-all ${
              sanity < 30 ? "bg-red-600 animate-pulse" : "bg-stone-400"
            }`}
            style={{ width: `${sanity}%` }}
          />
        </div>

        {/* Sheet music */}
        <div
          className={`relative mb-8 w-80 h-48 bg-[#e5e5e5] shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-100 ${
            feedbackMessage ? "bg-red-900" : ""
          }`}
          style={{
            transform: `rotate(${Math.random() * 1 - 0.5}deg) translate(${shake}px, 0)`,
          }}
        >
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/crumpled-paper.png')]" />
          <div className="text-center z-10 relative">
            {feedbackMessage ? (
              <div className="animate-bounce">
                <div className="text-red-600 font-black text-xl tracking-widest font-serif uppercase border-4 border-red-600 p-2 rotate-2 bg-black/10">
                  {feedbackMessage}
                </div>
              </div>
            ) : isFocusing ? (
              <div className="animate-pulse">
                <div
                  className="text-red-700 font-black text-3xl tracking-[0.5em] mb-2 font-serif"
                  style={{
                    textShadow: "2px 2px 4px rgba(150,0,0,0.5)",
                  }}
                >
                  {hallucinationText || SEQUENCE.join(" ")}
                </div>
                <div className="text-red-900/50 text-xs italic font-serif">
                  Do not miss a key
                </div>
              </div>
            ) : (
              <div className="opacity-30">
                <Music size={48} className="mx-auto mb-2 text-stone-600" />
                <div className="w-40 h-1 bg-stone-400 mb-2 mx-auto" />
                <div className="w-40 h-1 bg-stone-400 mb-2 mx-auto" />
                <div className="w-40 h-1 bg-stone-400 mb-2 mx-auto" />
              </div>
            )}
          </div>
          <div
            className={`absolute top-2 left-4 w-8 h-8 rounded-full bg-red-900 blur-md opacity-50 ${
              isFocusing && !feedbackMessage ? "block" : "hidden"
            }`}
          />
          <div
            className={`absolute bottom-4 right-10 w-12 h-12 rounded-full bg-red-900 blur-xl opacity-40 ${
              isFocusing && !feedbackMessage ? "block" : "hidden"
            }`}
          />
        </div>

        {/* Piano keys */}
        <div
          className="relative flex justify-center items-start bg-stone-900 p-4 pt-8 pb-8 rounded-t-lg shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
          style={{
            transform: `translate(${Math.random() * shake}px, ${
              Math.random() * shake
            }px)`,
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-4 bg-stone-800 rounded-t-lg border-b border-black" />
          {NOTES.map((noteObj) => {
            const isWhite = noteObj.type === "white";
            if (isWhite) {
              return (
                <button
                  key={noteObj.note}
                  onMouseDown={() => handleKeyPress(noteObj.note, noteObj.freq)}
                  className="relative w-12 h-48 bg-[#d6d3d1] border border-stone-400 rounded-b-md active:bg-stone-400 active:h-[11.8rem] transition-all mx-[1px] shadow-md z-10 group"
                >
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-stone-500/30 to-transparent pointer-events-none" />
                  <span
                    className={`absolute bottom-4 left-0 right-0 text-center font-bold text-red-600 opacity-0 transition-opacity duration-75 ${
                      isFocusing ? "opacity-100" : ""
                    }`}
                  >
                    {noteObj.note}
                  </span>
                  {isFocusing && SEQUENCE.includes(noteObj.note) && (
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-6 h-8 bg-red-900/40 blur-sm rounded-full pointer-events-none animate-pulse" />
                  )}
                </button>
              );
            }
            return (
              <button
                key={noteObj.note}
                onMouseDown={() => handleKeyPress(noteObj.note, noteObj.freq)}
                className="absolute z-20 w-8 h-28 bg-[#1c1917] border-b-4 border-black rounded-b-sm active:border-b-0 active:h-[6.9rem] transition-all shadow-lg group"
                style={{ left: getBlackKeyOffset(noteObj.note) }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-stone-700 to-black opacity-50" />
                <span
                  className={`absolute bottom-2 left-0 right-0 text-center text-xs font-bold text-red-500 opacity-0 transition-opacity duration-75 ${
                    isFocusing ? "opacity-100" : ""
                  }`}
                >
                  {noteObj.note}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile focus button */}
        <div className="absolute bottom-8 right-8 md:hidden z-50">
          <button
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl border-2 transition-colors ${
              isFocusing
                ? "bg-red-900 border-red-400"
                : "bg-stone-800 border-stone-500"
            }`}
            onTouchStart={() => setIsFocusing(true)}
            onTouchEnd={() => setIsFocusing(false)}
            onMouseDown={() => setIsFocusing(true)}
            onMouseUp={() => setIsFocusing(false)}
          >
            {isFocusing ? (
              <Eye className="text-white" />
            ) : (
              <EyeOff className="text-stone-400" />
            )}
          </button>
        </div>

        {/* Win / lose overlays (no separate start screen) */}
        {gameState === "LOST" && (
          <div className="absolute inset-0 z-[60] bg-red-950/80 flex flex-col items-center justify-center animate-pulse">
            <Skull size={80} className="text-red-500 mb-4" />
            <h1 className="text-4xl font-black text-red-600 tracking-tight mb-2">
              SILENCE
            </h1>
          </div>
        )}

        {gameState === "WON" && (
          <div className="absolute inset-0 z-[60] bg-stone-200 flex flex-col items-center justify-center text-stone-900">
            <Volume2 size={64} className="mb-4 text-stone-600" />
            <h1 className="text-4xl font-bold mb-4 font-serif">HARMONY</h1>
            <p className="mb-8 italic text-stone-600 text-sm">
              The presence seems soothed... for now.
            </p>
          </div>
        )}
      </div>
    </OverlayUI>
  );
}

// --- Helper for Black Key Positioning ---
function getBlackKeyOffset(note: string) {
  switch (note) {
    case "C#":
      return "35px";
    case "D#":
      return "90px";
    case "F#":
      return "190px";
    case "G#":
      return "245px";
    case "A#":
      return "300px";
    default:
      return "0px";
  }
}
