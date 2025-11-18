import { create } from 'zustand'

interface GameState {
  started: boolean
  locked: boolean
  flashOn: boolean
  // loop counter: increments each time the player completes a loop
  loop: number
  isDead: boolean
  respawnKey: number
  setStarted: (value: boolean) => void
  setLocked: (value: boolean) => void
  setFlashOn: (value: boolean) => void
  toggleFlashlight: () => void
  setLoop: (n: number) => void
  incrementLoop: () => void
  resetLoop: () => void
  die: () => void
  respawn: () => void
}

export const useGameState = create<GameState>((set) => ({
  started: false,
  locked: false,
  flashOn: false,
  loop: -1,
  isDead: false,
  respawnKey: 0,
  setStarted: (started) => set({ started }),
  setLocked: (locked) => set({ locked }),
  setFlashOn: (flashOn) => set({ flashOn }),
  toggleFlashlight: () => set((state) => ({ flashOn: !state.flashOn })),
  setLoop: (n: number) => set({ loop: n }),
  incrementLoop: () => set((s) => ({ loop: s.loop + 1 })),
  resetLoop: () => set({ loop: 0 }),
  die: () => set({ isDead: true }),
  respawn: () => set((s) => ({ isDead: false, respawnKey: s.respawnKey + 1 })),
}))