/**
 * Shared types for the avatar pipeline (PixelAnalyzer → AvatarBuilder → mesh).
 *
 * These describe the *data* that fully determines the 3D avatar. The live
 * Three.js mesh is rebuilt from this descriptor — we never store Three objects
 * in the Zustand store.
 */
import type { NormieType } from "@/api/types";

// ---------------------------------------------------------------------------
// Pixel grid + body segmentation
// ---------------------------------------------------------------------------

/** Body region a pixel row belongs to (per CLAUDE.md mapping). */
export type BodySegment = "head" | "shoulders" | "torso" | "legs";

/** A single "on" pixel, in grid coordinates (row 0 = top, col 0 = left). */
export interface Voxel {
  col: number; // 0..39
  row: number; // 0..39
}

/**
 * Voxels grouped by the rig parts that animate independently. Legs are split
 * left/right (by column) so the walk/run cycle alternates instead of marching.
 */
export interface SegmentedVoxels {
  head: Voxel[];
  shoulders: Voxel[];
  torso: Voxel[];
  legsLeft: Voxel[];
  legsRight: Voxel[];
}

export interface PixelGrid {
  /** Grid edge length (40). */
  size: number;
  /** Row-major occupancy, length size*size. true = pixel on. */
  cells: boolean[];
  /** Count of "on" pixels. */
  onCount: number;
  /** onCount / (size*size), 0..1. Drives world density later. */
  density: number;
}

/** Full analysis result for one Normie's bitmap. */
export interface AvatarGeometry {
  grid: PixelGrid;
  segments: SegmentedVoxels;
  /** Column the legs were split at (centroid of leg voxels). */
  legSplitCol: number;
}

// ---------------------------------------------------------------------------
// Material + build descriptor
// ---------------------------------------------------------------------------

export type MaterialKind = "matte" | "fur" | "emissive" | "reflective";

/** PBR material parameters derived from the Type trait. */
export interface MaterialConfig {
  kind: MaterialKind;
  /** Base albedo (hex). */
  color: string;
  roughness: number;
  metalness: number;
  /** Emissive color (emissive/alien materials). */
  emissive?: string;
  emissiveIntensity?: number;
  /** Normal-map strength for the procedural fur material. */
  normalScale?: number;
}

/**
 * Everything needed to render the avatar. Serializable → safe for the store.
 */
export interface AvatarBuild {
  normieId: number;
  type: NormieType;
  /** Raw 1600-char '0'/'1' bitmap — the mesh source of truth. */
  pixels: string;
  /** World size of one voxel cube (units). */
  voxelSize: number;
  material: MaterialConfig;
  /** Aura glow strength, derived from Canvas Level (0 = none). */
  auraIntensity: number;
  /** Accent color used for aura + emissive highlights. */
  accent: string;
}

// ---------------------------------------------------------------------------
// Animation
// ---------------------------------------------------------------------------

export type AvatarAnimationState = "idle" | "walk" | "run" | "jump";
