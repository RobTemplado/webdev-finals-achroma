"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSound } from "@/components/audio/useSound";

type SubtitleOptions = {
  maxLineChars?: number;
  lineDurationMs?: number;
  gapMs?: number;
  wpm?: number;
  minMs?: number;
  maxMs?: number;
};

type Para = {
  url: string;
  subtitle: string; // fallback: whole paragraph text
  // Optional fine-grained subtitle phasing for this paragraph
  subs?: Array<{
    text: string;
    atMs?: number; // when to show (relative to paragraph start)
    options?: SubtitleOptions; // override timings for this phrase
  }>;
  options?: SubtitleOptions; // default options for the paragraph
};

/**
 * Plays a short "radio" narration sequence after all 3D assets finish loading,
 * and displays corresponding subtitles while each paragraph is playing.
 *
 * Requirements covered:
 * - Start only after useProgress completes
 * - Play files: paragraph_1.wav, paragraph_2.wav, ... under /public/audio/radio
 * - Show matching subtitles while each file plays
 */
// Tweak subtitle timing here; the overlay will use these directly
const SUBTITLE_OPTS = {
  maxLineChars: 194, // wrapping width for game-style lines
  // Either use fixed per-line duration:
  lineDurationMs: 2600,
  // Or switch to words-per-minute timing by setting wpm > 0 (lineDurationMs ignored)
  wpm: 0, // e.g., 180 for auto timing
  gapMs: 220, // pause between lines
  minMs: 1400, // min per-line when using wpm
  maxMs: 5200, // max per-line when using wpm
} as const;

export default function RadioNarration() {
  const { active, progress, loaded, total } = useProgress();
  const { sound, resume } = useSound();
  const { scene } = useThree();

  const startedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const radioRef = useRef<THREE.Object3D | null>(null);

  // Define paragraphs and subtitles
  const sequence = useMemo<Para[]>(
    () => [
      {
        url: "/audio/radio/paragraph_1.wav",
        subs: [
          {
            text: "...and the time is now 2:17 AM.",
            atMs: 300,
            options: {
              lineDurationMs: 4900,
            },
          },
          {
            text: "We return to our top story, a developing situation in the",
            atMs: 4900,
            options: {
              lineDurationMs: 3000,
            },
          },
          {
            text: " Maple Creek neighborhood that has left residents in stunned silence.",
            atMs: 4900 + 3000,
            options: {
              lineDurationMs: 2000,
            },
          },
        ],
        subtitle:
          "...and the time is now 2:17 AM. We return to our top story, a developing situation in the Maple Creek neighborhood that has left residents in stunned silence.",
      },
      {
        url: "/audio/radio/paragraph_2.wav",
        subs: [
          {
            atMs: 0,
            text: "Police were called to a small suburban home earlier this evening after neighbors reported...",
            options: {
              lineDurationMs: 3400,
            },
          },
          {
            atMs: 3400,
            text: "erratic behavior...",
            options: {
              lineDurationMs: 400,
            },
          },
          {
            atMs: 3800,
            text: "and a persistent, high-pitched wailing. What they found has shocked even veteran officers.",
            options: {
              lineDurationMs: 3000,
            },
          },
        ],
        subtitle:
          "Police were called to a small suburban home earlier this evening after neighbors reported... erratic behavior... and a persistent, high-pitched wailing. What they found has shocked even veteran officers.",
      },
      {
        url: "/audio/radio/paragraph_3.wav",
        subs: [
          {
            atMs: 0,
            text: "Inside the residence, a 41-year-old father, whose name is being withheld, was discovered in the master bedroom. ",
            options: {
              lineDurationMs: 6000,
            },
          },
          {
            atMs: 6200,
            text: " He was unharmed, found sitting in a rocking chair, facing the corner.",
            options: {
              lineDurationMs: 3100,
            },
          },
          {
            atMs: 9400,
            text: " His wife and two children were found deceased in their beds.",
            options: {
              lineDurationMs: 4000,
            },
          },
        ],
        subtitle:
          "Inside the residence, a 41-year-old father, whose name is being withheld, was discovered in the master bedroom. He was unharmed, found sitting in a rocking chair, facing the corner. His wife and two children were found deceased in their beds.",
      },
      {
        url: "/audio/radio/paragraph_4.wav",
        subs: [
          {
            atMs: 0,
            text: "The suspect offered no resistance and has been described by authorities as 'detached' and 'unresponsive' to questioning.",
            options: {
              lineDurationMs: 4000,
            },
          },
          {
            atMs: 4100,
            text: " He has made only one statement, repeated several times to the arresting officers.",
            options: {
              lineDurationMs: 3000,
            },
          },
          {
            atMs: 7200,
            text: ' He claimed he was, quote, "Making the colors quiet."',
            options: {
              lineDurationMs: 4000,
            },
          },
        ],
        subtitle:
          "The suspect offered no resistance and has been described by authorities as 'detached' and 'unresponsive' to questioning. He has made only one statement, repeated several times to the arresting officers. He claimed he was, quote, \"Making the colors quiet.\"",
      },
    ],
    []
  );

  // Try to locate the "Radio" object in the scene graph
  const findRadio = (): THREE.Object3D | null => {
    // Cache result after first successful lookup
    if (radioRef.current && radioRef.current.parent) return radioRef.current;
    const obj = scene.getObjectByName("Radio");
    if (obj) radioRef.current = obj;
    return obj ?? null;
  };

  useEffect(() => {
    window.addEventListener("__radio_start__", begin);
    return () => {
      window.removeEventListener("__radio_start__", begin);
    };
  }, []);

  // Core sequence
  const begin = () => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Cancel any previous
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      // Ensure we have the Radio object (try briefly before falling back)
      let radioObj: THREE.Object3D | null = findRadio();
      const startedAt = performance.now();
      while (!radioObj && performance.now() - startedAt < 2000) {
        if (ac.signal.aborted) break;
        await new Promise((r) => setTimeout(r, 100));
        radioObj = findRadio();
      }

      for (let i = 0; i < sequence.length; i++) {
        if (ac.signal.aborted) break;
        const para = sequence[i];
        try {
          // Load into SoundManager cache (idempotent)
          const name = `radio_para_${i + 1}`;
          await sound.load(name, para.url).catch(() => void 0);
          if (ac.signal.aborted) break;

          // If we found a Radio object, use positional audio attached to it.
          // Otherwise, fall back to non-positional buffer source routed to ambient.
          let cleanup: (() => void) | null = null;
          let durationSec = 0;
          let usingPositional = false;
          const buf = (sound as any).getBuffer?.(name) as
            | AudioBuffer
            | undefined;

          if (radioObj && buf) {
            const pa = sound.createPositional(name, {
              volume: 0.18,
              refDistance: 2,
              rolloffFactor: 1.5,
              maxDistance: 24,
            });
            if (pa) {
              radioObj.add(pa);
              durationSec = buf.duration;
              usingPositional = true;
              try {
                pa.play();
              } catch {}
              cleanup = () => {
                try {
                  pa.stop();
                } catch {}
                try {
                  radioObj!.remove(pa);
                } catch {}
                try {
                  (pa as any).disconnect?.();
                } catch {}
              };
            }
          }

          // Fallback: non-positional playback routed to ambient group
          let src: AudioBufferSourceNode | null = null;
          let radioGain: GainNode | null = null;
          if (!usingPositional) {
            const buffer: AudioBuffer =
              buf ??
              (await fetch(para.url)
                .then((r) => r.arrayBuffer())
                .then((a) => sound.context.decodeAudioData(a.slice(0))));
            if (ac.signal.aborted) break;
            src = sound.context.createBufferSource();
            src.buffer = buffer;
            const groupGain = sound.getGroupNode("ambient");
            radioGain = sound.context.createGain();
            radioGain.gain.value = 0.15;
            src.connect(radioGain);
            radioGain.connect(groupGain);
            durationSec = buffer.duration;
            try {
              src.start();
            } catch {}
            cleanup = () => {
              try {
                src?.stop();
              } catch {}
              try {
                src?.disconnect();
              } catch {}
              try {
                radioGain?.disconnect();
              } catch {}
            };
          }

          // Keep track of current subtitle index
          setCurrentIndex(i);

          let ended = false;
          const scheduled: number[] = [];

          const clearScheduled = () => {
            while (scheduled.length) {
              const h = scheduled.pop()!;
              window.clearTimeout(h);
            }
          };

          const onEnded = () => {
            ended = true;
            try {
              cleanup?.();
            } catch {}
            clearScheduled();
          };

          // As THREE.Audio doesn't reliably expose ended, schedule a timeout guard
          const endHandle = window.setTimeout(
            onEnded,
            Math.max(50, (durationSec + 0.05) * 1000)
          );
          scheduled.push(endHandle);

          // Dispatch subtitles for this paragraph
          if (para.subs && para.subs.length > 0) {
            para.subs.forEach((sub, idx) => {
              const delay = Math.max(
                0,
                sub.atMs ?? (idx === 0 ? 0 : idx * 1000)
              );
              const handle = window.setTimeout(() => {
                if (ac.signal.aborted || ended) return;
                const evt = new CustomEvent("__radio_subtitle__", {
                  detail: {
                    text: sub.text,
                    options: {
                      ...SUBTITLE_OPTS,
                      ...(para.options ?? {}),
                      ...(sub.options ?? {}),
                    },
                    append: idx > 0,
                  },
                });
                window.dispatchEvent(evt);
              }, delay);
              scheduled.push(handle);
            });
          } else {
            // Fallback: single event for the whole paragraph
            const evt = new CustomEvent("__radio_subtitle__", {
              detail: {
                text: para.subtitle,
                options: { ...SUBTITLE_OPTS, ...(para.options ?? {}) },
                append: false,
              },
            });
            window.dispatchEvent(evt);
          }

          // Wait until it ends or aborted
          await new Promise<void>((resolve) => {
            const check = () => {
              if (ac.signal.aborted || ended) return resolve();
              setTimeout(check, 50);
            };
            check();
          });
        } catch (e) {
          console.warn("Failed to play radio paragraph:", para.url, e);
        }
      }

      // Clear subtitle
      setCurrentIndex(null);
      window.dispatchEvent(
        new CustomEvent("__radio_subtitle__", {
          detail: { text: "", append: false },
        })
      );

      // Signal end of narration
      window.dispatchEvent(new CustomEvent("__radio_narration_end__"));
    })();
  };

  // Cleanup sequence on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Subtitle dispatching handled inside begin() per paragraph/phrase

  return null;
}
