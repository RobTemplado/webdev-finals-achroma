import { create } from 'zustand'

interface GameState {
  started: boolean
  locked: boolean
  flashOn: boolean
  setStarted: (value: boolean) => void
  setLocked: (value: boolean) => void
  setFlashOn: (value: boolean) => void
  toggleFlashlight: () => void
}

export const useGameState = create<GameState>((set) => ({
  started: false,
  locked: false,
  flashOn: false,
  setStarted: (started) => set({ started }),
  setLocked: (locked) => set({ locked }),
  setFlashOn: (flashOn) => set({ flashOn }),
  toggleFlashlight: () => set((state) => ({ flashOn: !state.flashOn })),
}))