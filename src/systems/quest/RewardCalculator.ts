/**
 * RewardCalculator — turns Canvas data into quest rewards (per CLAUDE.md:
 * "Action Points from canvas/info = quest energy" and "Version count from
 * history = experience depth").
 *
 * Reward numbers are descriptive (shown in the Quest Log / Reward Screen) —
 * they are not written back to usePlayerStore.stats, which has no XP field.
 */
import type { CanvasInfo } from "@/api/types";
import type { QuestKind, QuestReward } from "./questTypes";

/** Action Points (canvas/info) = quest energy. */
export function questEnergy(canvas: CanvasInfo | null): number {
  return canvas?.actionPoints ?? 0;
}

/** Transform-history version count = experience depth. */
export function experienceDepth(versionCount: number): number {
  return Math.max(0, versionCount);
}

const BASE_AP: Record<QuestKind, number> = {
  main: 50,
  side: 25,
  secret: 35,
};

const BASE_XP: Record<QuestKind, number> = {
  main: 100,
  side: 50,
  secret: 75,
};

const KIND_MULTIPLIER: Record<QuestKind, number> = {
  main: 1,
  side: 0.6,
  secret: 0.85,
};

export interface RewardParams {
  kind: QuestKind;
  canvas: CanvasInfo | null;
  versionCount: number;
}

/** Reward scales with the Normie's own quest energy + experience depth. */
export function calculateReward({ kind, canvas, versionCount }: RewardParams): QuestReward {
  const energy = questEnergy(canvas);
  const depth = experienceDepth(versionCount);
  const mult = KIND_MULTIPLIER[kind];
  return {
    actionPoints: Math.round((BASE_AP[kind] + energy * 0.5) * mult),
    experience: Math.round((BASE_XP[kind] + depth * 8) * mult),
  };
}
