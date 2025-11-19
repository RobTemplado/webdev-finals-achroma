import { create } from 'zustand'

interface GameState {
  started: boolean
  locked: boolean
  flashOn: boolean
  // loop counter: increments each time the player completes a loop
  loop: number
  isDead: boolean
  respawnKey: number
  // player horizontal velocity in world space (m/s)
  playerVelocity: { x: number; y: number; z: number }
  setStarted: (value: boolean) => void
  setLocked: (value: boolean) => void
  setFlashOn: (value: boolean) => void
  toggleFlashlight: () => void
  setLoop: (n: number) => void
  incrementLoop: () => void
  resetLoop: () => void
  die: () => void
  respawn: () => void
  setPlayerVelocity: (v: { x: number; y: number; z: number }) => void
}

export const useGameState = create<GameState>((set) => ({
  started: false,
  locked: false,
  flashOn: false,
  loop: -1,
  isDead: false,
  respawnKey: 0,
  playerVelocity: { x: 0, y: 0, z: 0 },
  setStarted: (started) => set({ started }),
  setLocked: (locked) => set({ locked }),
  setFlashOn: (flashOn) => set({ flashOn }),
  toggleFlashlight: () => set((state) => ({ flashOn: !state.flashOn })),
  setLoop: (n: number) => set({ loop: n }),
  incrementLoop: () => set((s) => ({ loop: s.loop + 1 })),
  resetLoop: () => set({ loop: 0 }),
  die: () => set({ isDead: true }),
  respawn: () => set((s) => ({ isDead: false, respawnKey: s.respawnKey + 1 })),
  setPlayerVelocity: (playerVelocity) => set({ playerVelocity }),
}))