/**
 * Shared constants + helpers for the Null Normie boss fight (Phase 9).
 *
 * The arena's palette is fixed by the spec — deep red and void black — but
 * everything that *scales the fight* (HP, summon counts, evasiveness) lives in
 * BossStatCalculator and derives from the player's Normie. These are just the
 * staging values: dimensions, colors, and combat tunables.
 */
import * as THREE from "three";
import { mulberry32 } from "@/components/nexus/nexusConstants";

/** Boss palette — deep red corruption against void black. */
export const BOSS_COLORS = {
  voidBlack: "#03040a",
  fog: "#0a0204",
  bloodRed: "#ff2233",
  deepRed: "#8b0000",
  ember: "#ff5a3c",
  corruption: "#b8002e",
  platform: "#16060a",
  platformEdge: "#ff2a44",
  star: "#ffd2cf",
} as const;

/** Arena geometry. */
export const ARENA = {
  /** Walkable platform radius (units). */
  radius: 30,
  /** Platform slab half-height. */
  halfHeight: 1.2,
  /** Player spawn (near the platform's near edge). */
  spawn: [0, 3, 20] as [number, number, number],
  /** Y below which a fall counts as off-platform (PlayerController respawns). */
  killY: -20,
} as const;

/** Boss hover height above the platform surface. */
export const BOSS_HEIGHT = 4.2;

/** Combat tuning. */
export const COMBAT = {
  /** Player must be within this range to damage the boss. */
  strikeRange: 9,
  /** Continuous "purge" DPS as a fraction of maxHp, while in range. */
  purgeDpsFrac: 0.03,
  /** Minimum purge DPS (low-level bosses). */
  purgeDpsMin: 22,
  /** Click strike burst as a fraction of maxHp. */
  strikeBurstFrac: 0.045,
  /** Minimum strike burst. */
  strikeBurstMin: 55,
  /** Strike cooldown (seconds). */
  strikeCooldown: 0.35,
  /** Boss is briefly invulnerable right after a teleport. */
  teleportInvuln: 0.6,

  /** Player max HP fallback if stats are unset. */
  playerMaxHp: 100,
  /** Void-zone HP drain per second (phase 3). */
  voidDrainPerSec: 16,
  /** XOR attack cadence (phase 2), seconds. */
  xorInterval: 6,
  /** XOR attack damage. */
  xorDamage: 10,
  /** XOR flash duration (seconds). */
  xorFlashDuration: 0.32,
  /** Passive HP regen per second when out of danger. */
  regenPerSec: 6,
  /** HP threshold below which the player is teleported back to spawn + healed. */
  reviveHp: 1,
} as const;

/** A single phase-3 void zone on the platform floor. */
export interface VoidZone {
  x: number;
  z: number;
  /** Drain radius (units). */
  r: number;
}

/**
 * Deterministically open `count` void zones across the platform. Seeded from
 * the player's Normie so the same Normie always faces the same arena.
 */
export function generateVoidZones(seed: number, radius: number, count: number): VoidZone[] {
  const rng = mulberry32(seed ^ 0x4eff1d);
  return Array.from({ length: count }, () => {
    const a = rng() * Math.PI * 2;
    // Keep zones off the dead-center and inside the rim.
    const dist = radius * (0.25 + rng() * 0.55);
    return {
      x: Math.cos(a) * dist,
      z: Math.sin(a) * dist,
      r: 3.2 + rng() * 2.4,
    };
  });
}

/**
 * Live boss state shared (via a ref) between the Null Normie entity (writer)
 * and the combat director / hazards (readers) — avoids per-frame React churn.
 * Held in a React ref so per-frame mutation is the intended escape hatch.
 */
export interface BossRefData {
  pos: THREE.Vector3;
  /** True while the boss is mid-teleport and cannot be damaged. */
  invuln: boolean;
}

/** Create the initial shared boss ref payload. */
export function createBossRefData(): BossRefData {
  return { pos: new THREE.Vector3(0, BOSS_HEIGHT, -10), invuln: false };
}
