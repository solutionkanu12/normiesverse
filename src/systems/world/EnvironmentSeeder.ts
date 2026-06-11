/**
 * EnvironmentSeeder — converts a Normie's 40×40 pixel bitmap into world-space
 * object placements (per CLAUDE.md: pixel data places landmarks).
 *
 * The 40×40 grid is downsampled into an N×N coarse grid of fill ratios; each
 * coarse cell whose fill clears the biome threshold becomes one placement.
 * This preserves the Normie's silhouette (so a world is recognizably "shaped"
 * by its Normie) while keeping object counts bounded and walkable.
 */
import { NORMIE_GRID_SIZE } from "@/api/types";
import type { PixelGrid } from "@/systems/normie/avatar.types";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import type { PlacedObject, Vec3 } from "./worldTypes";

const SIZE = NORMIE_GRID_SIZE; // 40

/**
 * Downsample the bitmap into an N×N grid of fill ratios (0..1), row-major.
 * Each coarse cell averages the occupancy of the source pixels it covers.
 */
export function downsampleGrid(grid: PixelGrid, n: number): number[] {
  const out = new Array<number>(n * n).fill(0);
  const block = SIZE / n;
  for (let cy = 0; cy < n; cy++) {
    for (let cx = 0; cx < n; cx++) {
      const r0 = Math.floor(cy * block);
      const r1 = Math.floor((cy + 1) * block);
      const c0 = Math.floor(cx * block);
      const c1 = Math.floor((cx + 1) * block);
      let on = 0;
      let total = 0;
      for (let r = r0; r < r1; r++) {
        for (let c = c0; c < c1; c++) {
          if (grid.cells[r * SIZE + c]) on++;
          total++;
        }
      }
      out[cy * n + cx] = total > 0 ? on / total : 0;
    }
  }
  return out;
}

export interface SeedOptions {
  n: number;
  spacing: number;
  threshold: number;
  /** Deterministic jitter source seed. */
  seed: number;
  /** Max XZ jitter applied to each placement (units). */
  jitter?: number;
}

/**
 * Produce placements from the bitmap. Coarse cells are centered on the origin
 * so the world is laid out symmetrically around the player's spawn. `weight`
 * is the cell's fill ratio (drives height/size downstream).
 *
 * Coarse-grid rows map to world +Z and columns to world +X. `y` is left at 0;
 * callers (e.g. the void world) reposition vertically as needed.
 */
export function seedPlacements(grid: PixelGrid, opts: SeedOptions): PlacedObject[] {
  const { n, spacing, threshold, seed, jitter = 0 } = opts;
  const fills = downsampleGrid(grid, n);
  const rng = mulberry32(seed);
  const half = (n - 1) / 2;
  const out: PlacedObject[] = [];

  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const weight = fills[gy * n + gx];
      if (weight < threshold) continue;
      const jx = jitter ? (rng() - 0.5) * 2 * jitter : 0;
      const jz = jitter ? (rng() - 0.5) * 2 * jitter : 0;
      out.push({
        gx,
        gy,
        x: (gx - half) * spacing + jx,
        y: 0,
        z: (gy - half) * spacing + jz,
        weight,
      });
    }
  }
  return out;
}

/** Count of "on" neighbors (8-connected) for a coarse fill array — local density. */
export function coarseNeighborFill(fills: number[], n: number, gx: number, gy: number): number {
  let sum = 0;
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = gx + dx;
      const y = gy + dy;
      if (x < 0 || x >= n || y < 0 || y >= n) continue;
      sum += fills[y * n + x];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/** One deterministically-seeded enemy spawn (plain data — no THREE dependency). */
export interface SeededEnemy {
  home: Vec3;
  phase: number;
  patrolR: number;
  speedJitter: number;
}

/**
 * Deterministically place `count` enemies around the world center. Uses a
 * single rng stream so the result is stable for a given (seed, count, extent,
 * baseY) — QuestFactory calls this with the same arguments WorldEnemies uses,
 * guaranteeing combat objective targets match the actual enemy positions.
 */
export function seedEnemies(seed: number, count: number, extent: number, baseY: number): SeededEnemy[] {
  const rng = mulberry32(seed ^ 0x5bd1e995);
  return Array.from({ length: count }, () => {
    const a = rng() * Math.PI * 2;
    const r = extent * (0.3 + rng() * 0.6);
    return {
      home: [Math.cos(a) * r, baseY + rng() * 3, Math.sin(a) * r],
      phase: rng() * Math.PI * 2,
      patrolR: 2 + rng() * 4,
      speedJitter: 0.7 + rng() * 0.6,
    };
  });
}

/**
 * Pick the placement best suited to host the Reality Core: the highest-weight
 * placement that is also far from spawn, so collecting it requires exploration.
 * Returns null when there are no placements (caller supplies a fallback).
 */
export function pickCorePlacement(
  placements: PlacedObject[],
  spawn: [number, number, number],
): PlacedObject | null {
  if (placements.length === 0) return null;
  let best: PlacedObject | null = null;
  let bestScore = -Infinity;
  for (const p of placements) {
    const dx = p.x - spawn[0];
    const dz = p.z - spawn[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    const score = p.weight * 12 + dist * 0.4;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}
