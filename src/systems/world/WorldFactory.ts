/**
 * WorldFactory — the heart of Phase 7. Assembles a fully-derived
 * {@link WorldConfig} from one Normie's live API data (traits, pixels, Canvas
 * info) for a given world kind.
 *
 * Nothing here is hardcoded per-world beyond the *rules* that read the data:
 *   - Type chose the kind (via the portal) and drives enemy/material flavor.
 *   - Expression → palette (ColorPaletteEngine).
 *   - Pixel density → packing (BiomeCalculator).
 *   - Pixel bitmap → object placements (EnvironmentSeeder).
 *   - Accessory → architecture theme.
 *   - Canvas Level → enemy count scaling + hidden-area unlock.
 */
import type { CanvasInfo, NormieTraits } from "@/api/types";
import type { WorldKind } from "@/store/useWorldStore";
import { parsePixels } from "@/systems/normie/PixelAnalyzer";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import { biomeProfile } from "./BiomeCalculator";
import { buildPalette } from "./ColorPaletteEngine";
import { pickCorePlacement, seedPlacements } from "./EnvironmentSeeder";
import type { EnemyConfig, Vec3, WorldConfig } from "./worldTypes";

const WORLD_LABEL: Record<WorldKind, string> = {
  cyberpunk: "Cyberpunk Reality",
  frozen: "Frozen Reality",
  void: "Digital Void",
};

/** Synthetic Reality Core ids (1=cyber, 2=frozen, 3=void) — also used by portalGate. */
export const CORE_ID: Record<WorldKind, number> = {
  cyberpunk: 1,
  frozen: 2,
  void: 3,
};

/** Enemy silhouette per Normie Type. */
const ENEMY_SHAPE: Record<string, EnemyConfig["shape"]> = {
  Human: "drone",
  Cat: "feline",
  Alien: "wisp",
  Agent: "sentinel",
};

/** Canvas Level at which the hidden cache is revealed. */
const HIDDEN_AREA_LEVEL = 5;

/** Hash the pixel bitmap → a stable per-Normie seed. */
function hashPixels(pixels: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < pixels.length; i++) {
    h ^= pixels.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Map the Accessory trait to an architecture theme label (cyberpunk flavor). */
export function architectureFromAccessory(accessory: string): string {
  const a = (accessory || "").toLowerCase();
  if (!a || a === "none") return "Brutalist Slab";
  if (a.includes("hat") || a.includes("cap") || a.includes("crown")) return "Crowned Spires";
  if (a.includes("glass") || a.includes("vr") || a.includes("goggle")) return "Mirror Glass";
  if (a.includes("chain") || a.includes("necklace")) return "Hanging Gardens";
  if (a.includes("earring") || a.includes("piercing")) return "Studded Towers";
  if (a.includes("cigar") || a.includes("pipe") || a.includes("smoke")) return "Smokestacks";
  // Deterministic fallback theme keyed off the label so it's still data-driven.
  const themes = ["Stacked Capsules", "Lattice Frames", "Monolith Blocks", "Pagoda Decks"];
  let h = 0;
  for (let i = 0; i < a.length; i++) h = (h * 31 + a.charCodeAt(i)) >>> 0;
  return themes[h % themes.length];
}

/** Derive enemy config from Type, Expression, density and Canvas Level. */
function deriveEnemies(
  traits: NormieTraits,
  density: number,
  level: number,
  accent: string,
): EnemyConfig {
  const shape = ENEMY_SHAPE[traits.type] ?? "drone";
  // Aggression read from the Expression label (angry/serious → aggressive).
  const expr = (traits.expression || "").toLowerCase();
  const aggressive = /angr|serious|grim|smirk|frown|mad|stern/.test(expr);
  // Count scales with pixel density and rank, bounded for performance.
  const count = Math.max(3, Math.min(14, Math.round(density * 16 + level * 0.3)));
  return {
    count,
    speed: aggressive ? 4.2 : 2.4,
    aggroRange: aggressive ? 22 : 14,
    aggressive,
    shape,
    color: accent,
  };
}

export interface BuildWorldParams {
  kind: WorldKind;
  pixels: string;
  traits: NormieTraits;
  canvas: CanvasInfo | null;
}

/** Build the complete, derived world description. */
export function buildWorld({ kind, pixels, traits, canvas }: BuildWorldParams): WorldConfig {
  const grid = parsePixels(pixels);
  const density = grid.density;
  const seed = hashPixels(pixels);
  const level = canvas?.level ?? 1;

  const palette = buildPalette(kind, traits);
  const profile = biomeProfile(density, kind);

  const placements = seedPlacements(grid, {
    n: profile.coarseN,
    spacing: profile.spacing,
    threshold: profile.threshold,
    seed,
    jitter: kind === "frozen" ? profile.spacing * 0.25 : 0,
  });

  const half = ((profile.coarseN - 1) / 2) * profile.spacing;
  const extent = half + profile.spacing * 2;

  // Void platforms float at small, deterministic heights so the layout reads
  // as an archipelago but stays jump-reachable (jump apex ≈ 2.3u).
  if (kind === "void") {
    const yr = mulberry32(seed ^ 0x9e3779b9);
    for (const p of placements) {
      p.y = Math.round((yr() * 3 - 1) * 2) / 2; // −1 .. 2 in 0.5 steps
    }
  }

  // Spawn: void spawns at a guaranteed central platform; the flat worlds spawn
  // just past the structure field (0.92·extent) so the player faces the city.
  const spawn: Vec3 = kind === "void" ? [0, 2.6, 0] : [0, 2.6, extent * 0.92];

  // Reality Core: farthest dense placement, elevated above its host.
  const corePlace = pickCorePlacement(placements, spawn);
  const corePosition: Vec3 = corePlace
    ? [corePlace.x, corePlace.y + 3.2, corePlace.z]
    : [0, 4, -extent * 0.5];

  const enemies = deriveEnemies(traits, density, level, palette.accent);

  const hiddenAreaUnlocked = level >= HIDDEN_AREA_LEVEL;
  const hiddenAreaPosition: Vec3 = [extent * 1.35, kind === "void" ? 6 : 3, -extent * 0.35];

  return {
    kind,
    label: WORLD_LABEL[kind],
    seed,
    grid,
    density,
    palette,
    placements,
    extent,
    spawn,
    corePosition,
    coreColor: palette.accent,
    coreId: CORE_ID[kind],
    enemies,
    canvasLevel: level,
    hiddenAreaUnlocked,
    hiddenAreaPosition,
    architecture: architectureFromAccessory(traits.accessory),
    coarseN: profile.coarseN,
  };
}
