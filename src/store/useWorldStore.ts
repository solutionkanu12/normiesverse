/**
 * useWorldStore — the currently generated universe.
 *
 * Worlds are produced by the WorldFactory from Normie data (Phase 8): Type sets
 * the base world, Expression the palette, Accessory the architecture, pixel
 * density the world density. Scaffolded now.
 */
import { create } from "zustand";

export type WorldKind = "cyberpunk" | "frozen" | "void";

export interface WorldState {
  /** Active world, or null while in the Nexus. */
  kind: WorldKind | null;
  /** Deterministic seed derived from the Normie (e.g. pixel hash). */
  seed: number | null;
  /** Whether a generated world is currently loaded/ready. */
  ready: boolean;

  setWorld: (kind: WorldKind | null, seed?: number | null) => void;
  setReady: (ready: boolean) => void;
  reset: () => void;
}

const initial = {
  kind: null as WorldKind | null,
  seed: null as number | null,
  ready: false,
};

export const useWorldStore = create<WorldState>((set) => ({
  ...initial,
  setWorld: (kind, seed = null) => set({ kind, seed, ready: false }),
  setReady: (ready) => set({ ready }),
  reset: () => set({ ...initial }),
}));
