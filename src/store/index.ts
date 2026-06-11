/** Barrel for all Zustand stores. */
export { useGameStore } from "./useGameStore";
export { usePlayerStore } from "./usePlayerStore";
export { useWorldStore } from "./useWorldStore";
export { useQuestStore } from "./useQuestStore";
export { useNormieStore } from "./useNormieStore";
export { useAudioStore } from "./useAudioStore";
export { useAchievementStore } from "./useAchievementStore";

export type { GameState, GamePhase, BossRuntime } from "./useGameStore";
export type { PlayerState, PlayerStats, Vec3 } from "./usePlayerStore";
export type { WorldState, WorldKind } from "./useWorldStore";
export type { QuestState, RewardScreenData, QuestDialogue } from "./useQuestStore";
export type { Quest, QuestObjective, QuestStatus, QuestReward, QuestKind, MissionType } from "@/systems/quest/questTypes";
export type { NormieState } from "./useNormieStore";
export type { AudioState } from "./useAudioStore";
export type { AchievementState } from "./useAchievementStore";
