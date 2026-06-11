/**
 * BossStatCalculator — derives the Null Normie's fight parameters from the
 * player's own Normie data (per CLAUDE.md: "Boss (Null Normie) — HP scales with
 * player Canvas Level. Summons fragments built from the player's own pixel
 * data.").
 *
 * Nothing here is a magic constant divorced from the API: HP is the player's
 * Canvas Level, the boss's evasiveness is the inverse of the player's speed,
 * and every summon/hazard count scales with Canvas Level + pixel density (the
 * same density that seeded the worlds). Remove the Normies API and there is no
 * boss to fight.
 */
export type BossPhase = 1 | 2 | 3;

/** Player sprint speed — mirrors RUN_SPEED in PlayerController. */
export const PLAYER_SPRINT_SPEED = 18;

/** Boss HP per Canvas Level (CLAUDE.md: 1000 + level × 200). */
const HP_BASE = 1000;
const HP_PER_LEVEL = 200;

/** Tuning for the inverse speed relation: bossSpeed = K / playerSpeed. */
const SPEED_K = 90;
const SPEED_MIN = 2.4;
const SPEED_MAX = 9;

/** Phase boundaries as fractions of max HP. */
export const PHASE_2_THRESHOLD = 0.6;
export const PHASE_3_THRESHOLD = 0.3;

/** Teleport cadence (seconds) per phase — phase 1 = 8s, phase 3 = 3s. */
export const TELEPORT_INTERVAL: Record<BossPhase, number> = {
  1: 8,
  2: 6,
  3: 3,
};

export interface BossStats {
  /** 1000 + canvasLevel × 200. */
  maxHp: number;
  /** Boss flee/drift speed (units/s) — inversely proportional to player speed. */
  speed: number;
  /** Canvas Level the fight was scaled to (echoed for the HUD/victory screen). */
  canvasLevel: number;
  /** Phase 1: pixel fragments summoned from the player's bitmap. */
  fragmentCount: number;
  /** Phase 2: cross-world enemies summoned. */
  summonCount: number;
  /** Phase 3: void zones that open on the arena floor. */
  voidZoneCount: number;
}

export interface BossStatParams {
  /** Player Canvas Level (canvas/info). Defaults to 1 when unknown. */
  canvasLevel: number;
  /** Fraction of "on" pixels (0..1) — same density that seeds the worlds. */
  density: number;
  /** Player max speed; defaults to the sprint speed. */
  playerSpeed?: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Boss HP from Canvas Level. */
export function bossMaxHp(canvasLevel: number): number {
  return HP_BASE + Math.max(0, canvasLevel) * HP_PER_LEVEL;
}

/** Inverse-speed relation: a faster Walker faces a slower (but tankier) Null. */
export function bossSpeed(playerSpeed: number = PLAYER_SPRINT_SPEED): number {
  const s = playerSpeed > 0 ? SPEED_K / playerSpeed : SPEED_MAX;
  return clamp(s, SPEED_MIN, SPEED_MAX);
}

/** Current phase (1/2/3) for a given HP fraction. */
export function phaseForHp(hp: number, maxHp: number): BossPhase {
  const ratio = maxHp > 0 ? hp / maxHp : 0;
  if (ratio > PHASE_2_THRESHOLD) return 1;
  if (ratio > PHASE_3_THRESHOLD) return 2;
  return 3;
}

/** Assemble the full, data-derived boss stat block. */
export function calculateBossStats({ canvasLevel, density, playerSpeed }: BossStatParams): BossStats {
  const lvl = Math.max(1, Math.round(canvasLevel));
  return {
    maxHp: bossMaxHp(lvl),
    speed: bossSpeed(playerSpeed ?? PLAYER_SPRINT_SPEED),
    canvasLevel: lvl,
    fragmentCount: clamp(Math.round(4 + lvl * 0.3 + density * 8), 4, 14),
    summonCount: clamp(Math.round(3 + lvl * 0.2), 3, 9),
    voidZoneCount: clamp(Math.round(3 + lvl * 0.15), 3, 8),
  };
}
