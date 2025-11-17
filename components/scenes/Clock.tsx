"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useSound } from "../audio/useSound";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const CLOCK_NAME = "WallClock";
const CLOCK_HAND_HOUR_NAME = "HourHand";
const CLOCK_HAND_MINUTE_NAME = "MinutesHand";
const CLOCK_HAND_SECOND_NAME = "SecondsHand";

// Audio sprite timings (seconds) inside `clock_tick_tack.mp3`
// tick:   0   - 1.5s
// tack:   1.5 - end
const TICK_START = 0;
const TICK_DURATION = 1;
const TACK_START = 1;

// Stuck time: 2:17 AM (we'll park the hands here)
const STUCK_HOURS = 2;
const STUCK_MINUTES = 6;

export default function Clock() {
    const { scene } = useThree();
    const { sound, listener } = useSound();

    const clockRootRef = useRef<THREE.Object3D | null>(null);
    const hourRef = useRef<THREE.Object3D | null>(null);
    const minuteRef = useRef<THREE.Object3D | null>(null);
    const secondRef = useRef<THREE.Object3D | null>(null);

    const lastSecondRef = useRef<number | null>(null);
    const isTickRef = useRef<boolean>(true);
    const jitterRef = useRef<number>(0);
    const lastTickPhaseRef = useRef<"rest" | "forward">("rest");

    // Positional audio attached to the clock
    const positionalRef = useRef<THREE.PositionalAudio | null>(null);

    // Resolve clock hand objects from the loaded GLTF scene once
    useEffect(() => {
        const clockRoot = scene.getObjectByName(CLOCK_NAME) ?? null;
        if (!clockRoot) return;

        // enable shadows
        clockRoot.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                // child.receiveShadow = true;
            }
        });

        const clockBg = scene.getObjectByName("Circle005") ?? null;
        if (clockBg) {
            clockBg.receiveShadow = true;
            clockBg.castShadow = false;
        } else {
            console.warn("Clock background mesh not found");
        }

        clockRootRef.current = clockRoot;
        hourRef.current = clockRoot.getObjectByName(CLOCK_HAND_HOUR_NAME) ?? null;
        minuteRef.current = clockRoot.getObjectByName(CLOCK_HAND_MINUTE_NAME) ?? null;
        secondRef.current = clockRoot.getObjectByName(CLOCK_HAND_SECOND_NAME) ?? null;

        // Create and attach positional audio to the clock root, if we haven't yet
        if (!positionalRef.current) {
            const pos = new THREE.PositionalAudio(listener);
            pos.setRefDistance(2);
            pos.setRolloffFactor(1);
            pos.setMaxDistance(15);
            clockRoot.add(pos);
            positionalRef.current = pos;
        }

        return () => {
            if (positionalRef.current) {
                try {
                    clockRoot.remove(positionalRef.current);
                } catch {
                    // ignore
                }
            }
        };
    }, [scene, listener]);

    // Animate hands: clock visually stuck at 2:17, second hand "trying" to move
    useFrame(() => {
        const now = new Date();
        const seconds = now.getSeconds();

        // Base stuck positions for 2:17
        const stuckMinuteTotal = STUCK_MINUTES; // 17
        const stuckHourTotal = (STUCK_HOURS % 12) + stuckMinuteTotal / 60; // 2 + 17/60

        // Work in DEGREES first, then convert once to radians
        const minuteDeg = -(stuckMinuteTotal * 6); // 6° per minute
        const hourDeg = -112; // 30° per hour + 0.5° per minute

        // Second hand: stuck at 0 seconds base, but will jitter toward next second on each tick/tack
        const baseSeconds = 20;
        const baseSecDeg = -(baseSeconds * 6); // 6° per second

        const minuteRad = (minuteDeg * Math.PI) / 180;
        const hourRad = (hourDeg * Math.PI) / 180;
        const secRad = (baseSecDeg * Math.PI) / 180 + jitterRef.current; // jitterRef already in radians

        if (secondRef.current) {
            secondRef.current.rotation.z = secRad;
        }
        if (minuteRef.current) {
            minuteRef.current.rotation.z = minuteRad;
        }
        if (hourRef.current) {
            hourRef.current.rotation.z = hourRad;
        }

        // Play tick/tack on whole-second transitions (audio continues)
        if (lastSecondRef.current === null) {
            lastSecondRef.current = seconds;
            return;
        }

        if (seconds !== lastSecondRef.current) {
            const isTick = isTickRef.current;
            isTickRef.current = !isTick;

            // On each new second (each tick/tack), move toward the next second then back
            // baseSecDeg is the stuck position (0 seconds). Next second is -6 degrees
            // 
            
            
            

            const stepDeg = -1;
            jitterRef.current = (stepDeg * Math.PI) / 180;
            lastTickPhaseRef.current = "forward";

            setTimeout(() => {
                jitterRef.current = 0;
                lastTickPhaseRef.current = "rest";
            }, 100);


            const segmentStart = isTick ? TICK_START : TACK_START;
            const segmentDur = isTick ? TICK_DURATION : undefined;

            const buf = (sound as any).getBuffer
                ? (sound as any).getBuffer("clock_tick_tack")
                : null;

            if (buf && positionalRef.current) {
                const ctx = sound.context as AudioContext;
                const source = ctx.createBufferSource();
                source.buffer = buf;
                const start = segmentStart;
                const dur = segmentDur ?? buf.duration - segmentStart;

                const gain = ctx.createGain();
                const vol = 0.7;
                const now = ctx.currentTime;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(vol, now + 0.005);

                source.connect(gain);
                gain.connect((positionalRef.current as any).panner || positionalRef.current);

                try {
                    source.start(0, start, dur);
                } catch {
                    // ignore
                }

                const totalSec = dur;
                gain.gain.setValueAtTime(vol, now + Math.max(0, totalSec - 0.01));
                gain.gain.linearRampToValueAtTime(0, now + Math.max(0, totalSec - 0.002));

                const totalMs = totalSec * 1000 + 50;
                setTimeout(() => {
                    try {
                        source.stop();
                    } catch { }
                    try {
                        source.disconnect();
                        gain.disconnect();
                    } catch { }
                }, totalMs);
            }

            lastSecondRef.current = seconds;
        }
    });

    // This component does not render its own mesh; it just
    // finds the clock in the loaded GLTF scene and animates it.
    return null;
}