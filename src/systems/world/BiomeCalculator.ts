/**
 * BiomeCalculator — turns the Normie's pixel density into a packing profile
 * for a world (per CLAUDE.md: "Pixel density (count of 1s) sets world
 * density/landmark placement").
 *
 * Density is the fraction of "on" pixels (0..1). Real Normies cluster around
 * 0.25–0.55 fill, so we remap that band onto a sparse→dense scale and derive
 * the coarse-grid resolution, placement threshold, world spacing, object
 * height scale, and a descriptive fill tier.
 */
import type { WorldKind } from "@/store/useWorldStore";

export type FillTier = "sparse" | "medium" | "dense";

export interface BiomeProfile {
  /** Coarse downsample resolution (N×N blocks over the 40×40 grid). */
  coarseN: number;
  /** Minimum block fill (0..1) to place an object — lower = denser world. */
  threshold: number;
  /** World units between adjacent coarse cells. */
  spacing: number;
  /** Multiplier applied to object height/size. */
  heightScale: number;
  fill: FillTier;
}

/** Remap the realistic density band (~0.18..0.6) onto 0..1. */
function normalizeDensity(density: number): number {
  const lo = 0.18;
  const hi = 0.6;
  return Math.max(0, Math.min(1, (density - lo) / (hi - lo)));
}

export function fillTier(density: number): FillTier {
  const n = normalizeDensity(density);
  if (n < 0.34) return "sparse";
  if (n < 0.67) return "medium";
  return "dense";
}

/**
 * Derive the packing profile. Denser bitmaps lower the placement threshold
 * (so more blocks qualify) and tighten spacing slightly, producing a more
 * packed world. Void uses a finer grid so platforms read like the bitmap.
 */
export function biomeProfile(density: number, kind: WorldKind): BiomeProfile {
  const n = normalizeDensity(density);
  const tier = fillTier(density);

  // More density → lower threshold (place more), within sane bounds.
  const threshold = 0.42 - n * 0.27; // 0.42 (sparse) .. 0.15 (dense)

  switch (kind) {
    case "cyberpunk":
      return {
        coarseN: 20,
        threshold,
        spacing: 8.5,
        heightScale: 1 + n * 1.6, // denser cities reach higher
        fill: tier,
      };
    case "frozen":
      return {
        coarseN: 16,
        threshold: threshold + 0.05, // tundra reads sparser than a city
        spacing: 11,
        heightScale: 0.8 + n * 1.2,
        fill: tier,
      };
    case "void":
    default:
      return {
        coarseN: 18,
        threshold: threshold - 0.02, // keep enough platforms to traverse
        spacing: 9,
        heightScale: 1,
        fill: tier,
      };
  }
}
