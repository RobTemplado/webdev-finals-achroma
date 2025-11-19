import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Radio, AlertTriangle, EyeOff } from 'lucide-react';
import { useSound } from '../../audio/useSound';
import { useGameState } from '@/store/gameState';
import { SoundManager } from '../../audio/SoundManager';
import { OverlayUI } from '@/components/OverlayUI';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { consumeInteract } from '@/components/inputStore';
import { Html } from '@react-three/drei';
import { showSubtitle } from '@/hooks/useSubtitle';

// --- Types & Constants ---
const TARGET_FREQ = 98.3; // The P.T. inspired frequency
const TOLERANCE = 0.5; // How close you need to be
const FREQ_MIN = 88.0;
const FREQ_MAX = 108.0;
const PT_NUMBERS = "2... 0... 4... 8... 6... 3... Don't... turn... around...";

// --- Audio Controller (Web Audio API) ---
class AudioController {
  ctx: AudioContext | null = null;
  staticNode: AudioBufferSourceNode | null = null;
  staticGain: GainNode | null = null;
  toneOsc: OscillatorNode | null = null;
  toneGain: GainNode | null = null;
  voiceUtterance: SpeechSynthesisUtterance | null = null;
  isPlaying = false;

  init(sound: SoundManager) {
    if (this.isPlaying) return;
    this.ctx = sound.context;
    
    // 1. Create White Noise
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.staticNode = this.ctx.createBufferSource();
    this.staticNode.buffer = noiseBuffer;
    this.staticNode.loop = true;
    this.staticGain = this.ctx.createGain();
    this.staticGain.gain.value = 0;
    
    this.staticNode.connect(this.staticGain);
    this.staticGain.connect(this.ctx.destination);
    this.staticNode.start();

    // 2. Create Sine Tone
    this.toneOsc = this.ctx.createOscillator();
    this.toneOsc.type = 'sine';
    this.toneOsc.frequency.value = 1000;
    this.toneGain = this.ctx.createGain();
    this.toneGain.gain.value = 0;
    this.toneOsc.connect(this.toneGain);
    this.toneGain.connect(this.ctx.destination);
    this.toneOsc.start();

    this.isPlaying = true;
  }

  update(currentFreq: number, distance: number) {
    if (!this.ctx || !this.staticGain || !this.toneGain || !this.toneOsc) return;

    const maxDist = 10;
    const closeness = Math.max(0, 1 - (distance / maxDist));

    this.staticGain.gain.setTargetAtTime(0.1 + (1 - closeness) * 0.4, this.ctx.currentTime, 0.1);
    
    const toneHz = 200 + ((currentFreq - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)) * 1000;
    this.toneOsc.frequency.setTargetAtTime(toneHz, this.ctx.currentTime, 0.1);
    
    this.toneGain.gain.setTargetAtTime(closeness * 0.1, this.ctx.currentTime, 0.1);

    this.manageVoice(closeness);
  }

  manageVoice(closeness: number) {
    if (closeness > 0.9 && !window.speechSynthesis.speaking) {
        this.speak();
    } else if (closeness < 0.8 && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
  }

  speak() {
    if (this.voiceUtterance) return; 
    const u = new SpeechSynthesisUtterance(PT_NUMBERS);
    u.pitch = 0.5;
    u.rate = 0.6;
    u.volume = 1;
    u.onend = () => { this.voiceUtterance = null; };
    this.voiceUtterance = u;
    window.speechSynthesis.speak(u);
    showSubtitle(PT_NUMBERS);
  }

  stop() {
    if (this.staticNode) {
        try { this.staticNode.stop(); } catch {}
        this.staticNode.disconnect();
    }
    if (this.toneOsc) {
        try { this.toneOsc.stop(); } catch {}
        this.toneOsc.disconnect();
    }
    if (this.staticGain) this.staticGain.disconnect();
    if (this.toneGain) this.toneGain.disconnect();
    
    window.speechSynthesis.cancel();
    this.isPlaying = false;
    this.ctx = null;
  }
}

const audioCtrl = new AudioController();

export default function RadioPuzzleLoop() {
  const { sound } = useSound();
  const { scene, camera } = useThree();
  const incrementLoop = useGameState((s) => s.incrementLoop);
  const setLocked = useGameState((s) => s.setLocked);
  
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [frequency, setFrequency] = useState(94.5);
  const [solved, setSolved] = useState(false);
  const [lockedInTime, setLockedInTime] = useState(0);
  const [shake, setShake] = useState(0);
  const [glitchText, setGlitchText] = useState("");
  const [canInteract, setCanInteract] = useState(false);
  const [radioPos, setRadioPos] = useState<THREE.Vector3 | null>(null);
  const [finished, setFinished] = useState(false);
  
  // Touch/Drag Logic
  const [isDragging, setIsDragging] = useState(false);
  const lastX = useRef(0);

  // Refs for interaction logic
  const radioRef = useRef<THREE.Object3D | null>(null);
  const staticSoundRef = useRef<THREE.PositionalAudio | null>(null);

  // 1. Find Radio & Setup Static Sound
  useEffect(() => {
     showSubtitle("I should tune the radio to find the signal...", { lineDurationMs: 9000 });

    const radio = scene.getObjectByName("Radio");
    if (radio) {
      radioRef.current = radio;
      const pos = new THREE.Vector3();
      radio.getWorldPosition(pos);
      setRadioPos(pos);

      // Create positional static noise
      // We use a loop of static_light
      const audio = sound.createPositional("static_light", {
        volume: 0.8,
        refDistance: 2,
        maxDistance: 10,
      });
      
      if (audio) {
        // Manually set loop since createPositional defaults to false for one-shots
        audio.setLoop(true);
        radio.add(audio);
        audio.play();
        staticSoundRef.current = audio;
      }
    }

    return () => {
      // Cleanup static sound
      if (staticSoundRef.current) {
        staticSoundRef.current.stop();
        staticSoundRef.current.disconnect();
        if (radioRef.current) {
            radioRef.current.remove(staticSoundRef.current);
        }
      }
    };
  }, [scene, sound]);

  // 2. Interaction Loop (Raycasting)
  useFrame(() => {
    if (started || !radioRef.current) return;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    const intersects = raycaster.intersectObject(radioRef.current, true);
    const isLooking = intersects.length > 0 && intersects[0].distance < 3;
    
    if (isLooking !== canInteract) {
      setCanInteract(isLooking);
    }
  });

  // Handle click to interact (works even with pointer lock)
  useEffect(() => {
    if (started) return;

    const handleGlobalClick = () => {
        if (canInteract) {
            setStarted(true);
            if (staticSoundRef.current) staticSoundRef.current.stop();
        }
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [started, canInteract]);

  // 3. UI Fade In/Out Logic
  useEffect(() => {
    if (started) {
        setLocked(false);
        const t = setTimeout(() => setVisible(true), 100);
        
        return () => {
            clearTimeout(t);
        };
    }
  }, [started, setLocked]);

  // Game Loop
  useEffect(() => {
    if (!started || solved) return;

    let animationFrame: number;
    const loop = () => {
      const distance = Math.abs(frequency - TARGET_FREQ);
      audioCtrl.update(frequency, distance);

      if (distance < TOLERANCE) {
        setLockedInTime(prev => prev + 1);
        setShake(Math.random() * 5);
        setGlitchText(Math.random() > 0.5 ? "LOOK BEHIND YOU" : "204863");
        
        if (lockedInTime > 200) {
          setSolved(true);
          audioCtrl.stop();
          setVisible(false); 
          window.dispatchEvent(new CustomEvent("__unlock_end_door__"));
          setTimeout(() => setFinished(true), 2000);
        }
      } else {
        setLockedInTime(0);
        setShake(distance < 5 ? Math.random() * 2 : 0);
        setGlitchText("");
        window.speechSynthesis.cancel();
      }
      
      animationFrame = requestAnimationFrame(loop);
    };

    loop();
    return () => cancelAnimationFrame(animationFrame);
  }, [started, frequency, solved, lockedInTime, incrementLoop]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          audioCtrl.stop();
      }
  }, []);

  // --- FIXED DRAGGING LOGIC ---
  const handleStart = (clientX: number) => {
    setIsDragging(true);
    lastX.current = clientX;
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMove = (e: MouseEvent | TouchEvent) => {
      let clientX;
      if ('touches' in e) {
        clientX = (e as TouchEvent).touches[0].clientX;
      } else {
        clientX = (e as MouseEvent).clientX;
      }

      const delta = lastX.current - clientX;
      lastX.current = clientX;
      
      setFrequency(prev => {
        let next = prev + (delta * 0.05);
        if (next > FREQ_MAX) next = FREQ_MAX; 
        if (next < FREQ_MIN) next = FREQ_MIN;
        return Number(next.toFixed(2));
      });
    };

    const handleWindowUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchmove', handleWindowMove);
    window.addEventListener('touchend', handleWindowUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchmove', handleWindowMove);
      window.removeEventListener('touchend', handleWindowUp);
    };
  }, [isDragging]);

  const handleInit = () => {
    audioCtrl.init(sound);
    // setStarted(true); // Already started by interaction
  };

  if (!started) {
      return (
          <>
            {canInteract && radioPos && (
                <Html position={radioPos} center>
                    <div className="pointer-events-none text-white text-xs font-mono tracking-widest bg-black/50 px-2 py-1 backdrop-blur-sm border border-white/20">
                        INTERACT
                    </div>
                </Html>
            )}
          </>
      );
  }

  if (finished) return null;

  return (
    <OverlayUI>
        <div className={`${!visible ? "-z-100" : ""} w-full h-full font-sans transition-opacity duration-2000 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            {/* Initial "Touch to Start" screen is skipped if we auto-start from interaction, 
                but we need to init audio context. 
                Since we are already in a user interaction (click/key), we can init audio immediately.
            */}
            <AutoInitAudio sound={sound} onInit={() => {}} />
            
            <div className={`w-full h-full bg-neutral-950 overflow-hidden relative flex flex-col items-center justify-between py-12 select-none touch-none ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                {/* Global Effects */}
                <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-30 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] animate-grain"></div>
                <Scanlines />
                <Vignette />
                
                {/* Shake Container */}
                <div 
                    className="w-full h-full flex flex-col justify-between relative z-10 transition-transform duration-75"
                    style={{ transform: `translate(${Math.random() * shake - shake/2}px, ${Math.random() * shake - shake/2}px)` }}
                >
                    {/* Top: Visualizer / Status */}
                    <div className="w-full px-6 pt-8 flex flex-col items-center">
                    <div className={`w-full h-32 border border-stone-800 bg-black relative overflow-hidden transition-all duration-500 ${lockedInTime > 0 ? 'border-red-900 shadow-[0_0_30px_rgba(255,0,0,0.3)]' : ''}`}>
                        {/* Waveform */}
                        <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-50">
                            {[...Array(20)].map((_, i) => (
                                <div 
                                key={i} 
                                className={`w-1 bg-stone-500 transition-all duration-75`}
                                style={{ 
                                    height: `${Math.random() * (lockedInTime > 0 ? 100 : 20)}%`,
                                    backgroundColor: lockedInTime > 0 ? '#7f1d1d' : '#44403c'
                                }}
                                />
                            ))}
                        </div>
                        
                        {/* Glitch Text Overlay */}
                        {glitchText && (
                            <div className="absolute inset-0 flex items-center justify-center text-red-600 font-bold text-2xl tracking-widest animate-ping font-mono mix-blend-hard-light">
                            {glitchText}
                            </div>
                        )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-stone-600 text-xs tracking-widest">
                        <div className={`w-2 h-2 rounded-full ${lockedInTime > 0 ? 'bg-red-600 animate-ping' : 'bg-stone-800'}`}></div>
                        {lockedInTime > 0 ? "SIGNAL DETECTED" : "SEARCHING..."}
                    </div>
                    </div>

                    {/* Center: Frequency Display */}
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className={`text-6xl md:text-8xl font-mono font-bold tracking-tighter transition-colors duration-300 ${lockedInTime > 0 ? 'text-red-600 blur-[1px]' : 'text-stone-300'}`}>
                                {frequency.toFixed(1)}
                            </div>
                            <span className="absolute -bottom-6 right-0 text-sm text-stone-600 font-mono">MHz</span>
                            <div className="absolute -inset-10 flex items-center justify-center -z-10 opacity-10 text-9xl font-black text-red-900 pointer-events-none">
                                {lockedInTime > 0 && "204863"}
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Tuner Dial */}
                    <div className="w-full px-4 mb-12">
                    <div 
                        className="relative w-full h-24 bg-stone-900 border-y-4 border-stone-800 flex items-center overflow-hidden cursor-grab active:cursor-grabbing touch-none"
                        onMouseDown={(e) => handleStart(e.clientX)}
                        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
                    >
                        {/* Center Marker */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-red-600 z-20 shadow-[0_0_10px_red]"></div>
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white z-20"></div>

                        {/* Moving Scale */}
                        <div 
                            className="absolute top-0 bottom-0 flex items-center transition-transform duration-75 ease-out will-change-transform"
                            style={{ 
                                left: '50%',
                                transform: `translateX(${(98 - frequency) * 60}px)`
                            }}
                        >
                            {/* Generate Scale Ticks */}
                            {[...Array(200)].map((_, i) => {
                                const val = 88 + (i * 0.2);
                                const isMajor = i % 5 === 0;
                                return (
                                    <div key={i} className="relative flex flex-col items-center justify-center" style={{ width: '12px' }}>
                                        <div className={`w-0.5 ${isMajor ? 'h-12 bg-stone-400' : 'h-6 bg-stone-700'}`}></div>
                                        {isMajor && (
                                            <span className="absolute top-16 text-[10px] text-stone-500 font-mono font-bold">
                                                {val.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black to-transparent z-10"></div>
                        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black to-transparent z-10"></div>
                    </div>
                    
                    <div className="mt-4 flex justify-between px-4 text-stone-600 text-xs font-mono uppercase">
                        <span>Signal Strength</span>
                        <div className="flex gap-1">
                            {[1,2,3,4,5].map(Bar => (
                                <div 
                                    key={Bar} 
                                    className={`w-3 h-1 ${lockedInTime > 0 && Math.random() > 0.2 ? 'bg-red-600' : 'bg-stone-800'}`}
                                />
                            ))}
                        </div>
                    </div>
                    </div>
                </div>

                {lockedInTime > 50 && lockedInTime < 150 && (
                    <div className="absolute top-1/3 left-0 w-full text-center animate-pulse">
                        <span className="bg-black text-red-500 px-2 font-mono text-sm">HOLD FREQUENCY</span>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes grain {
                    0%, 100% { transform:translate(0,0) }
                    10% { transform:translate(-5%,-10%) }
                    20% { transform:translate(-15%,5%) }
                    30% { transform:translate(7%,-25%) }
                    40% { transform:translate(-5%,25%) }
                    50% { transform:translate(-15%,10%) }
                    60% { transform:translate(15%,0%) }
                    70% { transform:translate(0%,15%) }
                    80% { transform:translate(3%,35%) }
                    90% { transform:translate(-10%,10%) }
                }
                .animate-grain {
                    animation: grain 8s steps(10) infinite;
                }
            `}</style>
        </div>
    </OverlayUI>
  );
}

function AutoInitAudio({ sound, onInit }: { sound: SoundManager, onInit: () => void }) {
    useEffect(() => {
        audioCtrl.init(sound);
        onInit();
    }, [sound, onInit]);
    return null;
}

const Scanlines = () => (
  <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden" style={{
    background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
    backgroundSize: '100% 4px'
  }}></div>
);

const Vignette = () => (
    <div className="absolute inset-0 pointer-events-none z-30" style={{
        background: 'radial-gradient(circle, rgba(0,0,0,0) 50%, rgba(0,0,0,0.9) 100%)'
    }}></div>
);