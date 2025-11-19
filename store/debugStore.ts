import { create } from 'zustand';
import * as THREE from 'three';

type DebugShape =
  | { type: 'box'; id: string; position: [number, number, number]; size: [number, number, number]; color: string; duration?: number }
  | { type: 'sphere'; id: string; position: [number, number, number]; radius: number; color: string; duration?: number }
  | { type: 'line'; id: string; start: [number, number, number]; end: [number, number, number]; color: string; duration?: number };

interface DebugStore {
  shapes: DebugShape[];
  addBox: (position: THREE.Vector3 | [number, number, number], size?: [number, number, number], color?: string, duration?: number) => void;
  addSphere: (position: THREE.Vector3 | [number, number, number], radius?: number, color?: string, duration?: number) => void;
  addLine: (start: THREE.Vector3 | [number, number, number], end: THREE.Vector3 | [number, number, number], color?: string, duration?: number) => void;
  clear: () => void;
  remove: (id: string) => void;
}

export const useDebugStore = create<DebugStore>((set, get) => ({
  shapes: [],
  addBox: (pos, size = [1, 1, 1], color = 'red', duration = 0) => {
    const id = Math.random().toString(36).substr(2, 9);
    const position = Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z] as [number, number, number];
    set((state) => ({ shapes: [...state.shapes, { type: 'box', id, position, size, color, duration }] }));
    if (duration > 0) setTimeout(() => get().remove(id), duration);
  },
  addSphere: (pos, radius = 1, color = 'red', duration = 0) => {
    const id = Math.random().toString(36).substr(2, 9);
    const position = Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z] as [number, number, number];
    set((state) => ({ shapes: [...state.shapes, { type: 'sphere', id, position, radius, color, duration }] }));
    if (duration > 0) setTimeout(() => get().remove(id), duration);
  },
  addLine: (start, end, color = 'red', duration = 0) => {
    const id = Math.random().toString(36).substr(2, 9);
    const s = Array.isArray(start) ? start : [start.x, start.y, start.z] as [number, number, number];
    const e = Array.isArray(end) ? end : [end.x, end.y, end.z] as [number, number, number];
    set((state) => ({ shapes: [...state.shapes, { type: 'line', id, start: s, end: e, color, duration }] }));
    if (duration > 0) setTimeout(() => get().remove(id), duration);
  },
  clear: () => set({ shapes: [] }),
  remove: (id) => set((state) => ({ shapes: state.shapes.filter((s) => s.id !== id) })),
}));

/**
 * Static API for debugging gizmos.
 * Can be called from anywhere (even outside React components).
 */
export const DebugGizmos = {
  box: (pos: THREE.Vector3 | [number, number, number], size: [number, number, number] = [1, 1, 1], color = 'red', duration = 0) => 
    useDebugStore.getState().addBox(pos, size, color, duration),
  sphere: (pos: THREE.Vector3 | [number, number, number], radius = 1, color = 'red', duration = 0) => 
    useDebugStore.getState().addSphere(pos, radius, color, duration),
  line: (start: THREE.Vector3 | [number, number, number], end: THREE.Vector3 | [number, number, number], color = 'red', duration = 0) => 
    useDebugStore.getState().addLine(start, end, color, duration),
  clear: () => useDebugStore.getState().clear(),
};
