/**
 * AvatarBuilder — turns a selected Normie's API data into a serializable
 * {@link AvatarBuild} descriptor + derived player stats.
 *
 * Type trait → material:
 *   Human → matte        (rough, non-metallic)
 *   Cat   → fur          (procedural normal map, fully rough)
 *   Alien → emissive glow (self-illuminating)
 *   Agent → reflective   (metallic, low roughness)
 *
 * Canvas Level → aura glow intensity.
 */
import type { CanvasInfo, NormieTraits, NormieType } from "@/api/types";
import { PIXEL_ON_COLOR } from "@/api/types";
import type { PlayerStats } from "@/store/usePlayerStore";
import type { AvatarBuild, MaterialConfig } from "./avatar.types";

/** Default world size of one voxel cube → ~2.0 unit tall avatar (40 × 0.05). */
export const DEFAULT_VOXEL_SIZE = 0.05;

/** Accent color per Type — also used for aura + emissive highlights. */
const TYPE_ACCENT: Record<NormieType, string> = {
  Human: "#4fc3f7", // electric blue
  Cat: "#c9a84c", // soft gold
  Alien: "#00ff9d", // emerald
  Agent: "#9fb4d8", // cold steel
};

/** Build the PBR material config from the Type trait. */
export function materialConfigForType(type: NormieType): MaterialConfig {
  const accent = TYPE_ACCENT[type] ?? TYPE_ACCENT.Human;
  switch (type) {
    case "Cat":
      return {
        kind: "fur",
        color: PIXEL_ON_COLOR,
        roughness: 1.0,
        metalness: 0.0,
        normalScale: 0.7,
      };
    case "Alien":
      return {
        kind: "emissive",
        color: "#0b3326",
        roughness: 0.5,
        metalness: 0.0,
        emissive: accent,
        emissiveIntensity: 1.4,
      };
    case "Agent":
      return {
        kind: "reflective",
        color: "#c8d2e0",
        roughness: 0.14,
        metalness: 0.95,
      };
    case "Human":
    default:
      return {
        kind: "matte",
        color: PIXEL_ON_COLOR,
        roughness: 0.88,
        metalness: 0.0,
      };
  }
}

/**
 * Map Canvas Level → aura glow intensity.
 *
 * Levels observed range from 1 to ~120. We use a log curve so early levels
 * still glow a little and high levels don't blow out: ~0.2 at L1 up to ~2.2 at L120.
 */
export function auraIntensityForLevel(level: number): number {
  const l = Math.max(1, level || 1);
  const norm = Math.min(1, Math.log10(l) / Math.log10(120)); // 0..1
  return 0.2 + norm * 2.0;
}

/** Build the full avatar descriptor from the selected Normie's data. */
export function buildAvatar(params: {
  id: number;
  pixels: string;
  traits: NormieTraits;
  canvas: CanvasInfo | null;
  voxelSize?: number;
}): AvatarBuild {
  const { id, pixels, traits, canvas } = params;
  const type = (traits.type ?? "Human") as NormieType;
  const level = canvas?.level ?? 1;

  return {
    normieId: id,
    type,
    pixels,
    voxelSize: params.voxelSize ?? DEFAULT_VOXEL_SIZE,
    material: materialConfigForType(type),
    auraIntensity: auraIntensityForLevel(level),
    accent: TYPE_ACCENT[type] ?? TYPE_ACCENT.Human,
  };
}

/**
 * Derive starting player stats from Canvas data.
 *   Level → rank + health scaling.
 *   Action Points → stamina pool.
 */
export function deriveStats(canvas: CanvasInfo | null): Partial<PlayerStats> {
  const level = canvas?.level ?? 1;
  const actionPoints = canvas?.actionPoints ?? 0;
  const maxHealth = 100 + Math.max(0, level - 1) * 10;
  return {
    level,
    actionPoints,
    maxActionPoints: actionPoints,
    health: maxHealth,
    maxHealth,
  };
}

export { TYPE_ACCENT };
