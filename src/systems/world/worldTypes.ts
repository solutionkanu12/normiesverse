/**
 * Types for the world-generation layer.
 *
 * A {@link WorldConfig} is the fully-derived, serializable description of one
 * generated universe. Every field traces back to live Normies API data
 * (traits, pixels, Canvas info) — the WorldFactory never invents values.
 *
 * Pipeline: traits + pixels + canvas + kind
 *   → ColorPaletteEngine (palette)
 *   → BiomeCalculator    (density → packing profile)
 *   → EnvironmentSeeder  (pixel grid → object placements)
 *   → WorldFactory       (assembles the WorldConfig)
 */
import type { WorldKind } from "@/store/useWorldStore";
import type { PixelGrid } from "@/systems/normie/avatar.types";

export type Vec3 = [number, number, number];

/** Colors that theme a world — all derived from Type + Expression. */
export interface WorldPalette {
  /** Scene clear color (hex string). */
  background: string;
  /** Fog color + distances. */
  fog: string;
  fogNear: number;
  fogFar: number;
  /** Primary structure / terrain color. */
  primary: string;
  /** Secondary structure accent. */
  secondary: string;
  /** Emissive neon / glow accent (Expression-driven). */
  accent: string;
  /** Ambient light color. */
  ambient: string;
  /** Key (directional) light color. */
  key: string;
  /** Atmospheric particle color. */
  particle: string;
}

/**
 * One object placed from the pixel bitmap. `gx/gy` are coarse-grid coords,
 * `x/z` world position, `weight` the block fill ratio (0..1) → drives height
 * or size. `y` is the object's base height (used for floating void platforms).
 */
export interface PlacedObject {
  gx: number;
  gy: number;
  x: number;
  y: number;
  z: number;
  weight: number;
}

/** Enemy entity configuration — trait + density driven. */
export interface EnemyConfig {
  /** How many enemies to spawn (pixel density + level). */
  count: number;
  /** Patrol / drift speed (units/s). */
  speed: number;
  /** Distance at which an enemy starts tracking the player. */
  aggroRange: number;
  /** Whether enemies actively close on the player (Expression-driven). */
  aggressive: boolean;
  /** Appearance keyed by Normie Type. */
  shape: "drone" | "feline" | "wisp" | "sentinel";
  /** Body color (hex). */
  color: string;
}

/** Fully-derived description of one generated universe. */
export interface WorldConfig {
  kind: WorldKind;
  label: string;
  /** Deterministic seed (hash of the pixel bitmap). */
  seed: number;
  /** Parsed 40×40 bitmap. */
  grid: PixelGrid;
  /** Fraction of "on" pixels (0..1) — packs the world. */
  density: number;
  palette: WorldPalette;
  /** Structures / crystals / platforms seeded from the bitmap. */
  placements: PlacedObject[];
  /** World extent radius (ground plane size / bounds). */
  extent: number;
  /** Player spawn. */
  spawn: Vec3;
  /** Reality Core location + color. */
  corePosition: Vec3;
  coreColor: string;
  /** Synthetic Reality Core id stored on collection (1=cyber, 2=frozen, 3=void). */
  coreId: number;
  enemies: EnemyConfig;
  /** Canvas Level (rank). */
  canvasLevel: number;
  /** Canvas Level ≥ threshold reveals a hidden cache. */
  hiddenAreaUnlocked: boolean;
  hiddenAreaPosition: Vec3;
  /** Architecture theme label derived from the Accessory trait. */
  architecture: string;
  /** Coarse downsample resolution used to seed `placements` (BiomeProfile.coarseN) — quests use this to map canvas/diff pixel indices back to placements. */
  coarseN: number;
}
