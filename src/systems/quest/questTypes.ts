/**
 * Types for the quest system (Phase 8). Every quest is generated from one
 * Normie's traits + Canvas data + canvas/diff + transform-history version
 * count — see QuestFactory. Nothing here is hardcoded per-world; only the
 * shapes are fixed.
 */
import type { WorldKind } from "@/store/useWorldStore";
import type { Vec3 } from "@/systems/world/worldTypes";

export type MissionType = "stealth" | "combat" | "exploration" | "puzzle";
export type QuestKind = "main" | "side" | "secret";
export type QuestStatus = "locked" | "active" | "completed";

/**
 * A "reach target(s) within radius" objective. Progress is proximity-driven
 * via QuestTracker, except the main quest's `recover-core` objective, which
 * is completed externally when the Reality Core orb is collected.
 */
export interface QuestObjective {
  id: string;
  description: string;
  /** World-space points the player must reach. */
  targets: Vec3[];
  /** Proximity radius (units) that counts as "reached". */
  radius: number;
  /** How many distinct targets must be reached to complete this objective. */
  targetCount: number;
  /** Indices into `targets` already reached. */
  consumedTargets: number[];
  done: boolean;
}

/** Action Points (quest energy) + Experience (transform-history depth). */
export interface QuestReward {
  actionPoints: number;
  experience: number;
}

export interface Quest {
  id: string;
  worldKind: WorldKind;
  kind: QuestKind;
  /** Trait-combo-derived mission type (side quest only). */
  missionType?: MissionType;
  title: string;
  description: string;
  /** Lore/flavor text shown in dialogue toasts and the quest log. */
  dialogue: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  reward: QuestReward;
}
