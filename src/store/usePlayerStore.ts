/**
 * usePlayerStore — wallet identity, avatar build, stats, position, progression.
 *
 * walletAddress is the connected Ethereum address (read-only; no signing).
 * `avatar` is the serializable descriptor (from AvatarBuilder) that fully
 * determines the 3D voxel mesh — built in Phase 4 from the selected Normie.
 * Stats are seeded from the Normie's Canvas Level + Action Points.
 */
import { create } from "zustand";
import type { AvatarBuild } from "@/systems/normie/avatar.types";

export type Vec3 = [number, number, number];

export interface PlayerStats {
  /** Canvas Level → rank. */
  level: number;
  /** Action Points → stamina/quest energy. */
  actionPoints: number;
  maxActionPoints: number;
  health: number;
  maxHealth: number;
}

export interface PlayerState {
  /** Connected Ethereum wallet address (identity only — read-only). */
  walletAddress: string | null;
  /** Voxel avatar descriptor for the selected Normie (mesh source of truth). */
  avatar: AvatarBuild | null;
  stats: PlayerStats;
  position: Vec3;
  /** Token IDs of Reality Cores the player has recovered. */
  realityCores: number[];

  setWalletAddress: (address: string | null) => void;
  setAvatar: (avatar: AvatarBuild | null) => void;
  setStats: (stats: Partial<PlayerStats>) => void;
  setPosition: (position: Vec3) => void;
  addRealityCore: (coreId: number) => void;
  reset: () => void;
}

const initialStats: PlayerStats = {
  level: 1,
  actionPoints: 0,
  maxActionPoints: 0,
  health: 100,
  maxHealth: 100,
};

const initial = {
  walletAddress: null as string | null,
  avatar: null as AvatarBuild | null,
  stats: initialStats,
  position: [0, 0, 0] as Vec3,
  realityCores: [] as number[],
};

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initial,
  setWalletAddress: (walletAddress) => set({ walletAddress }),
  setAvatar: (avatar) => set({ avatar }),
  setStats: (stats) => set((s) => ({ stats: { ...s.stats, ...stats } })),
  setPosition: (position) => set({ position }),
  addRealityCore: (coreId) =>
    set((s) => (s.realityCores.includes(coreId) ? s : { realityCores: [...s.realityCores, coreId] })),
  reset: () => set({ ...initial, stats: { ...initialStats } }),
}));
