"use client";

import * as THREE from "three";

export type SoundGroup = "master" | "sfx" | "music" | "ambient" | "ui";

export type OneShotOptions = {
  group?: SoundGroup;
  volume?: number; // 0..1
  playbackRate?: number; // e.g., 0.95..1.05 for variation
  detune?: number; // cents (not all browsers)
};

// Options for playing only a segment of a loaded buffer
export type SegmentOptions = OneShotOptions & {
  /** Start time in seconds within the buffer */
  start: number;
  /** Optional duration (seconds). If omitted, plays until end of buffer. */
  duration?: number;
};

export type PositionalOptions = OneShotOptions & {
  refDistance?: number;
  rolloffFactor?: number;
  maxDistance?: number;
};

export type MusicOptions = {
  volume?: number;
  loop?: boolean;
  fade?: number; // seconds for fade-in/out
};

type BufferCache = Map<string, AudioBuffer>;

// Small helper for time-based fades using rAF
function tween(durationSec: number, fn: (t01: number) => void, done?: () => void) {
  const start = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - start) / (durationSec * 1000));
    fn(t);
    if (t < 1) requestAnimationFrame(step);
    else done?.();
  }
  requestAnimationFrame(step);
}

export class SoundManager {
  readonly listener: THREE.AudioListener;
  readonly context: AudioContext;
  private buffers: BufferCache = new Map();

  // group routing
  private master: GainNode;
  private groups: Record<Exclude<SoundGroup, "master">, GainNode>;

  // music state
  private currentMusic?: THREE.Audio;
  private currentMusicName?: string;
  private queuedMusic?: { name: string; opts: MusicOptions };

  // active loops
  private activeLoops: Map<string, () => void> = new Map();

  // simple rate-limits
  private lastFootstepAt = 0;

  constructor(listener: THREE.AudioListener) {
    this.listener = listener;
    this.context = (listener.context as unknown as AudioContext) ?? new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: "interactive",
    } as any);


    const audioSession: any = (navigator as any).audioSession;
    if (audioSession) {
      audioSession.type = "playback"
    }

    // Create routing graph: source -> group -> master -> destination
    const ctx = this.context;
    this.master = ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(ctx.destination);

    const makeGroup = () => {
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(this.master);
      return g;
    };
    this.groups = {
      sfx: makeGroup(),
      music: makeGroup(),
      ambient: makeGroup(),
      ui: makeGroup(),
    };

    // Attach the listener to use same context routing
    // Drei/THREE uses listener.gain -> context.destination internally; we’ll keep our own routing for groups
    // We still add the listener to the scene camera so PositionalAudio works.
  }

  async resume() {
    if (this.context.state !== "running") {
      try {
        await this.context.resume();
      } catch {}
    }
  }

  setGroupVolume(group: SoundGroup, volume: number) {
    const v = Math.max(0, Math.min(1, volume));
    if (group === "master") this.master.gain.value = v;
    else this.groups[group].gain.value = v;
  }

  getGroupNode(group: SoundGroup): GainNode {
    if (group === "master") return this.master;
    return this.groups[group];
  }

  async load(name: string, url: string): Promise<void> {
    if (this.buffers.has(name)) return;
    // Use THREE.AudioLoader so loads participate in the global LoadingManager (preloader progress)
    const loader = new THREE.AudioLoader();
    const buf = await new Promise<AudioBuffer>((resolve, reject) => {
      loader.load(
        url,
        (buffer) => resolve(buffer),
        undefined,
        (err) => reject(err)
      );
    });
    this.buffers.set(name, buf);
  }

  async preload(entries: Record<string, string>) {
    await Promise.all(
      Object.entries(entries).map(([n, u]) => this.load(n, u).catch(() => void 0))
    );
  }

  has(name: string) {
    return this.buffers.has(name);
  }

  private getBuffer(name: string): AudioBuffer | undefined {
    return this.buffers.get(name);
  }

  // Non-positional one-shot
  playOneShot(name: string, opts: OneShotOptions = {}) {
    const buf = this.getBuffer(name);
    if (!buf) return;
    const src = new THREE.Audio(this.listener);
    // route THREE.Audio through our group gains via context graph
    // THREE.Audio internally creates a GainNode -> panner/ destination; we can just set volume and play
    src.setBuffer(buf);
    src.setLoop(false);
    if (opts.playbackRate) src.setPlaybackRate(opts.playbackRate);
    if (typeof (src as any).detune === "number" && typeof opts.detune === "number") {
      (src as any).detune = opts.detune;
    }
    const vol = Math.max(0, Math.min(1, opts.volume ?? 1));
    src.setVolume(vol);

    // Connect to group node by replacing the listener gain destination
    const group = this.getGroupNode(opts.group ?? "sfx");
    const gain: GainNode = (src as any).gain?.gain?.context ? (src as any).gain.gain as any : undefined;
    // Fallback: just rely on src volume + master (works in most cases)
    // Play
    src.play();
    // Stop and dispose when ended
    const onEnd = () => {
      src.stop();
      (src as any).disconnect?.();
    };
    // THREE.Audio doesn’t expose ended event, let it run; GC will collect after buffer end.
    // Optionally schedule a stop
    setTimeout(onEnd, (buf.duration + 0.1) * 1000);
  }

  /**
   * Play a segment (slice) of an AudioBuffer.
   * Uses THREE.Audio for compatibility.
   */
  playSegment(name: string, segment: SegmentOptions) {
    // Ensure context is running
    if (this.context.state !== "running") {
      console.warn("AudioContext not running; attempting to resume.");
      this.context.resume().catch((e) => console.error(e));
    }
    
    const buf = this.getBuffer(name);
    if (!buf) {
      console.error(`SoundManager: Buffer not found for segment play: ${name}`);
      return;
    }

    const { start, duration, group = "sfx", volume = 1, playbackRate = 1, detune } = segment;
    
    // Use THREE.Audio to ensure compatibility with listener/context
    const src = new THREE.Audio(this.listener);
    src.setBuffer(buf);
    src.setLoop(false);
    src.setVolume(volume);
    src.setPlaybackRate(playbackRate);
    if (detune !== undefined) src.setDetune(detune);

    // Set offset/duration
    // @ts-ignore - THREE.Audio supports offset/duration but types might vary
    src.offset = start;
    if (duration !== undefined) {
        // @ts-ignore
        src.duration = duration;
    }

    console.log(`Playing segment: ${name} from ${start} for ${duration ?? "full length"}`);

    src.play();

    // Cleanup
    const effectiveDuration = duration !== undefined ? duration : (buf.duration - start);
    const totalMs = (effectiveDuration / playbackRate) * 1000 + 100;

    setTimeout(() => {
        if (src.isPlaying) src.stop();
        if (src.disconnect) src.disconnect();
    }, totalMs);
  }

  /**
   * Play a segment (slice) of an AudioBuffer in a loop.
   * Returns a function to stop the loop (with a fade out).
   * @param loopId Optional ID to register this loop for later stopping via stopLoop(id)
   */
  playLoopingSegment(name: string, segment: SegmentOptions, loopId?: string): () => void {
    if (this.context.state !== "running") {
      console.warn("AudioContext not running; attempting to resume.");
      this.context.resume().catch(e => console.error(e));
    }
    const buf = this.getBuffer(name);
    if (!buf) return () => {};

    // If a loop with this ID already exists, stop it first
    if (loopId && this.activeLoops.has(loopId)) {
      this.stopLoop(loopId);
    }

    const { start, duration, group = "sfx", volume = 1, playbackRate = 1, detune } = segment;
    if (start >= buf.duration) return () => {};

    const ctx = this.context;
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    source.loopStart = start;
    if (duration !== undefined) {
      source.loopEnd = Math.min(buf.duration, start + duration);
    } else {
      source.loopEnd = buf.duration;
    }

    source.playbackRate.value = playbackRate;
    if (typeof detune === "number" && (source as any).detune) {
      (source as any).detune.value = detune;
    }

    const gain = ctx.createGain();
    const vol = Math.max(0, Math.min(1, volume));
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.1);

    const groupNode = this.getGroupNode(group);
    source.connect(gain);
    gain.connect(groupNode);

    try {
      // Start at the beginning of the segment
      source.start(now, start);
    } catch {
      return () => {};
    }

    // Return a stop function
    const stopFn = () => {
      // Remove from map if it was registered
      if (loopId && this.activeLoops.get(loopId) === stopFn) {
        this.activeLoops.delete(loopId);
      }

      const stopTime = ctx.currentTime;
      try {
        gain.gain.cancelScheduledValues(stopTime);
        gain.gain.setValueAtTime(gain.gain.value, stopTime);
        gain.gain.linearRampToValueAtTime(0, stopTime + 0.2);
      } catch {}

      setTimeout(() => {
        try {
          source.stop();
        } catch {}
        try {
          source.disconnect();
          gain.disconnect();
        } catch {}
      }, 250);
    };

    if (loopId) {
      this.activeLoops.set(loopId, stopFn);
    }

    return stopFn;
  }

  stopLoop(loopId: string) {
    const stopFn = this.activeLoops.get(loopId);
    if (stopFn) {
      stopFn();
      // The stopFn itself handles removal from the map, but we can ensure it here too
      this.activeLoops.delete(loopId);
    }
  }

  // Convenience helpers for door open/close using a single sprite file
  playDoorOpen() {
    // Account for encoder delay padding at the beginning of compressed files (mp3/aac)
    // Fudge a tiny offset so the transient hits instantly
    const OPEN_START = 0.0; // ~20ms
    const OPEN_DUR = Math.max(0.05, 1.5 - OPEN_START);
    this.playSegment("door_open_close", { start: OPEN_START, duration: OPEN_DUR, group: "sfx", volume: 1 });
  }

  playDoorClose() {
    // Start slightly after the boundary to avoid overlap with the open slice boundary
    const CLOSE_START = 1.52; // 0.1s + 20ms
    this.playSegment("door_open_close", { start: CLOSE_START, group: "sfx", volume: 1 });
  }

  playMusic(name: string, opts: MusicOptions = {}) {
    // If the AudioContext is not yet running (no user interaction),
    // remember this request so it can be started later.
    if (this.context.state !== "running") {
      this.queuedMusic = { name, opts };
      return;
    }

    if (this.currentMusicName === name) return;

    // Stop any existing music (optional fade-out based on previous options is not tracked)
    this.stopMusic(opts.fade);

    const buf = this.getBuffer(name);
    if (!buf) return;

    const src = new THREE.Audio(this.listener);
    src.setBuffer(buf);
    src.setLoop(opts.loop ?? false);
    src.setVolume(0);
    src.play();

    this.currentMusic = src;
    this.currentMusicName = name;

    const targetVol = Math.max(0, Math.min(1, opts.volume ?? 1));
    if (opts.fade && opts.fade > 0) {
      tween(opts.fade, (t) => {
        src.setVolume(t * targetVol);
      });
    } else {
      src.setVolume(targetVol);
    }
  }

  stopMusic(fade?: number) {
    if (!this.currentMusic) return;
    const src = this.currentMusic;
    this.currentMusic = undefined;
    this.currentMusicName = undefined;

    const stopNow = () => {
      try {
        src.stop();
      } catch {}
    };

    if (fade && fade > 0) {
      const startVol = src.getVolume();
      tween(fade, (t) => {
        src.setVolume(startVol * (1 - t));
      }, stopNow);
    } else {
      stopNow();
    }
  }

  /**
   * Called after a successful user interaction resume to play any queued music.
   */
  playQueuedMusic() {
    if (!this.queuedMusic) return;
    const queued = this.queuedMusic;
    this.queuedMusic = undefined;
    this.playMusic(queued.name, queued.opts);
  }

  // Positional one-shot using THREE.PositionalAudio; user should attach node to an Object3D.
  createPositional(name: string, opts: PositionalOptions = {}): THREE.PositionalAudio | null {
    const buf = this.getBuffer(name);
    if (!buf) return null;
    const src = new THREE.PositionalAudio(this.listener);
    src.setBuffer(buf);
    src.setLoop(false);
    if (opts.playbackRate) src.setPlaybackRate(opts.playbackRate);
    const vol = Math.max(0, Math.min(1, opts.volume ?? 1));
    src.setVolume(vol);
    if (opts.refDistance !== undefined) src.setRefDistance(opts.refDistance);
    if (opts.rolloffFactor !== undefined) src.setRolloffFactor(opts.rolloffFactor);
    if (opts.maxDistance !== undefined) src.setMaxDistance(opts.maxDistance);
    return src;
  }

  // Convenience variations
  async playFootstep(which: "left" | "right" | "any" = "any", volumeMultiplier: number = 1) {
    const now = performance.now();
    if (now - this.lastFootstepAt < 110) return; // rate limit
    this.lastFootstepAt = now;
    const idx = 1 + Math.floor(Math.random() * 3); // 1..3
    const name = `footstep_${idx}`;
    if (this.has(name)) {
      this.playOneShot(name, {
        group: "sfx",
        volume: (0.6 + Math.random() * 0.15) * volumeMultiplier,
        playbackRate: 0.95 + Math.random() * 0.1,
      });
    }
  }
}
