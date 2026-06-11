/**
 * PixelAnalyzer — parses a Normie's /pixels bitmap into a structured 40×40 grid
 * and segments the "on" pixels into body regions for the avatar rig.
 *
 * Row → body mapping (1-indexed, from CLAUDE.md):
 *   rows  1–8   → head
 *   rows  9–12  → shoulders
 *   rows 13–28  → torso
 *   rows 29–40  → legs
 */
import { NORMIE_GRID_SIZE, NORMIE_PIXEL_COUNT } from "@/api/types";
import type {
  AvatarGeometry,
  BodySegment,
  PixelGrid,
  SegmentedVoxels,
  Voxel,
} from "./avatar.types";

const SIZE = NORMIE_GRID_SIZE; // 40

/** 0-indexed row → body segment. Covers all 40 rows with no gaps. */
export function segmentForRow(row: number): BodySegment {
  if (row < 8) return "head"; // rows 1–8
  if (row < 12) return "shoulders"; // rows 9–12
  if (row < 28) return "torso"; // rows 13–28
  return "legs"; // rows 29–40
}

/**
 * Parse a 1600-char '0'/'1' string into a {@link PixelGrid}.
 * Throws if the input isn't exactly 1600 valid bits.
 */
export function parsePixels(pixels: string): PixelGrid {
  if (pixels.length !== NORMIE_PIXEL_COUNT) {
    throw new Error(
      `Invalid pixel string: expected ${NORMIE_PIXEL_COUNT} chars, got ${pixels.length}`,
    );
  }
  const cells = new Array<boolean>(NORMIE_PIXEL_COUNT);
  let onCount = 0;
  for (let i = 0; i < NORMIE_PIXEL_COUNT; i++) {
    const on = pixels.charCodeAt(i) === 49; // '1'
    cells[i] = on;
    if (on) onCount++;
  }
  return {
    size: SIZE,
    cells,
    onCount,
    density: onCount / NORMIE_PIXEL_COUNT,
  };
}

/** Row/col → flat index. */
export function indexOf(row: number, col: number): number {
  return row * SIZE + col;
}

/** Convenience: is the pixel at (row, col) on? */
export function isOn(grid: PixelGrid, row: number, col: number): boolean {
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return false;
  return grid.cells[indexOf(row, col)];
}

/**
 * Compute the column to split the legs into left/right halves — the centroid
 * (mean column) of all leg voxels, so an off-center Normie still splits evenly.
 * Falls back to the grid midline when there are no leg pixels.
 */
function computeLegSplit(grid: PixelGrid): number {
  let sum = 0;
  let n = 0;
  for (let row = 28; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid.cells[indexOf(row, col)]) {
        sum += col;
        n++;
      }
    }
  }
  return n > 0 ? sum / n : (SIZE - 1) / 2;
}

/**
 * Segment all "on" voxels into rig parts. Legs are split left/right at the
 * centroid column for an alternating gait.
 */
export function segmentVoxels(grid: PixelGrid): { segments: SegmentedVoxels; legSplitCol: number } {
  const legSplitCol = computeLegSplit(grid);
  const segments: SegmentedVoxels = {
    head: [],
    shoulders: [],
    torso: [],
    legsLeft: [],
    legsRight: [],
  };

  for (let row = 0; row < SIZE; row++) {
    const seg = segmentForRow(row);
    for (let col = 0; col < SIZE; col++) {
      if (!grid.cells[indexOf(row, col)]) continue;
      const v: Voxel = { col, row };
      switch (seg) {
        case "head":
          segments.head.push(v);
          break;
        case "shoulders":
          segments.shoulders.push(v);
          break;
        case "torso":
          segments.torso.push(v);
          break;
        case "legs":
          if (col < legSplitCol) segments.legsLeft.push(v);
          else segments.legsRight.push(v);
          break;
      }
    }
  }

  return { segments, legSplitCol };
}

/** Full pipeline: pixel string → grid + segmented voxels. */
export function analyzePixels(pixels: string): AvatarGeometry {
  const grid = parsePixels(pixels);
  const { segments, legSplitCol } = segmentVoxels(grid);
  return { grid, segments, legSplitCol };
}
