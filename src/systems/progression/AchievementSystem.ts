/**
 * AchievementSystem — pure definitions + evaluation (Phase 11).
 *
 * Every condition reads from *this* Normie's live API-derived state — Canvas
 * Level/Action Points/customization (`/canvas/info`), pixel density
 * (`/pixels`), and the trait-seeded Reality Cores/boss fight. Nothing here is
 * hardcoded independent of the chosen Normie (CLAUDE.md core rule).
 */
import { CORE_ID } from "@/systems/world/WorldFactory";

export interface AchievementContext {
  /** True once the avatar has been built from the selected Normie's pixels/traits. */
  avatarReady: boolean;
  /** Canvas Level (rank), or null if unknown. */
  canvasLevel: number | null;
  /** Action Points (quest energy), or null if unknown. */
  actionPoints: number | null;
  /** Whether this Normie carries Canvas customizations. */
  customized: boolean;
  /** Pixel "on" density (0..1) from /pixels, or null if unknown. */
  pixelDensity: number | null;
  /** Token IDs of Reality Cores recovered so far. */
  realityCores: number[];
  /** True once any quest objective has been completed. */
  questObjectiveDone: boolean;
  /** True once the Null Normie has been defeated. */
  bossDefeated: boolean;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  check: (ctx: AchievementContext) => boolean;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "identity-confirmed",
    title: "Identity Confirmed",
    description: "Your Normie's on-chain data became your avatar.",
    check: (ctx) => ctx.avatarReady,
  },
  {
    id: "canvas-customized",
    title: "Reshaped",
    description: "This Normie carries Canvas customizations.",
    check: (ctx) => ctx.customized,
  },
  {
    id: "veteran-walker",
    title: "Veteran Walker",
    description: "Reach Canvas Level 5 or higher.",
    check: (ctx) => (ctx.canvasLevel ?? 0) >= 5,
  },
  {
    id: "surplus-energy",
    title: "Surplus Energy",
    description: "Carry 50 or more Action Points.",
    check: (ctx) => (ctx.actionPoints ?? 0) >= 50,
  },
  {
    id: "dense-construct",
    title: "Dense Construct",
    description: "Your Normie's bitmap is more than half filled.",
    check: (ctx) => (ctx.pixelDensity ?? 0) >= 0.5,
  },
  {
    id: "minimal-signature",
    title: "Minimal Signature",
    description: "Your Normie's bitmap is a quarter filled or less.",
    check: (ctx) => ctx.pixelDensity !== null && ctx.pixelDensity <= 0.25,
  },
  {
    id: "quest-initiate",
    title: "Quest Initiate",
    description: "Complete your first quest objective.",
    check: (ctx) => ctx.questObjectiveDone,
  },
  {
    id: "core-cyberpunk",
    title: "Cyberpunk Reality Core",
    description: "Recover the Reality Core from the Cyberpunk reality.",
    check: (ctx) => ctx.realityCores.includes(CORE_ID.cyberpunk),
  },
  {
    id: "core-frozen",
    title: "Frozen Reality Core",
    description: "Recover the Reality Core from the Frozen reality.",
    check: (ctx) => ctx.realityCores.includes(CORE_ID.frozen),
  },
  {
    id: "core-void",
    title: "Void Reality Core",
    description: "Recover the Reality Core from the Digital Void.",
    check: (ctx) => ctx.realityCores.includes(CORE_ID.void),
  },
  {
    id: "reality-restored",
    title: "Reality Restored",
    description: "Recover all three Reality Cores.",
    check: (ctx) => Object.values(CORE_ID).every((id) => ctx.realityCores.includes(id)),
  },
  {
    id: "null-normie-purged",
    title: "Null Normie Purged",
    description: "Defeat the Null Normie and restore the Verse.",
    check: (ctx) => ctx.bossDefeated,
  },
];

const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS_BY_ID.get(id);
}

/** IDs of every achievement whose condition currently holds. */
export function computeUnlocked(ctx: AchievementContext): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(ctx)).map((a) => a.id);
}
