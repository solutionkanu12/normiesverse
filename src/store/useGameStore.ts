/**
 * useGameStore — top-level game flow and scene routing, plus the Null Normie
 * boss-fight runtime (Phase 9).
 *
 * Tracks where the player is in the journey:
 * landing → selection → nexus → world → boss → victory.
 *
 * The boss runtime (HP, phase, XOR flash) lives here so the arena scene, the
 * combat director, and the HUD all read/write one source of truth. HP and the
 * derived phase come from BossStatCalculator — the fight is scaled entirely
 * from the player's Canvas Level (CLAUDE.md core rule).
 *
 * Wallet identity lives in usePlayerStore; Normie ownership in useNormieStore.
 */
import { create } from "zustand";
import { phaseForHp, type BossPhase } from "@/systems/combat/BossStatCalculator";

export type GamePhase =
  | "landing"
  | "selection"
  | "nexus"
  | "portal"
  | "world"
  | "boss"
  | "victory";

export interface BossRuntime {
  /** True once the fight has started (boss spawned). */
  active: boolean;
  /** True the moment HP reaches 0. */
  defeated: boolean;
  /** Max HP = 1000 + canvasLevel × 200. */
  maxHp: number;
  /** Current HP (clamped ≥ 0). */
  hp: number;
  /** Derived phase (1 = 100–60%, 2 = 60–30%, 3 = 30–0%). */
  phase: BossPhase;
  /** Brief full-screen invert pulse (phase-2 XOR attack). */
  xorFlash: boolean;
}

export interface GameState {
  phase: GamePhase;
  /** Whether the intro/boot sequence has finished. */
  booted: boolean;
  /** True while the pause menu is open (Escape) — freezes player controllers. */
  paused: boolean;
  boss: BossRuntime;

  setPhase: (phase: GamePhase) => void;
  setBooted: (booted: boolean) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;

  /** Begin the fight with the given max HP (from BossStatCalculator). */
  startBoss: (maxHp: number) => void;
  /** Apply damage to the boss; recomputes phase + defeated. */
  damageBoss: (amount: number) => void;
  /** Toggle the XOR invert flash (phase-2 attack). */
  setXorFlash: (xorFlash: boolean) => void;
  /** Clear boss runtime (e.g. on leaving the arena). */
  resetBoss: () => void;

  reset: () => void;
}

const initialBoss: BossRuntime = {
  active: false,
  defeated: false,
  maxHp: 0,
  hp: 0,
  phase: 1,
  xorFlash: false,
};

const initial = {
  phase: "landing" as GamePhase,
  booted: false,
  paused: false,
  boss: { ...initialBoss },
};

export const useGameStore = create<GameState>((set) => ({
  ...initial,
  setPhase: (phase) => set({ phase }),
  setBooted: (booted) => set({ booted }),
  setPaused: (paused) => set({ paused }),
  togglePause: () => set((s) => ({ paused: !s.paused })),

  startBoss: (maxHp) =>
    set({ boss: { active: true, defeated: false, maxHp, hp: maxHp, phase: 1, xorFlash: false } }),

  damageBoss: (amount) =>
    set((s) => {
      if (!s.boss.active || s.boss.defeated || amount <= 0) return {};
      const hp = Math.max(0, s.boss.hp - amount);
      return {
        boss: {
          ...s.boss,
          hp,
          phase: phaseForHp(hp, s.boss.maxHp),
          defeated: hp <= 0,
        },
      };
    }),

  setXorFlash: (xorFlash) => set((s) => ({ boss: { ...s.boss, xorFlash } })),

  resetBoss: () => set({ boss: { ...initialBoss } }),

  reset: () => set({ ...initial, boss: { ...initialBoss } }),
}));
