/**
 * Type definitions for the Normies API (https://api.normies.art).
 *
 * These mirror the documented endpoints in CLAUDE.md. Every game system is
 * built on top of these shapes — keep them faithful to the live API.
 */

// ---------------------------------------------------------------------------
// Trait vocabulary (closed sets documented in CLAUDE.md)
// ---------------------------------------------------------------------------

export type NormieType = "Human" | "Cat" | "Alien" | "Agent";
export type NormieGender = "Male" | "Female" | "Non-Binary";
export type NormieAge = "Young" | "Middle-Aged" | "Old";

/**
 * Hair Style, Facial Feature, Eyes, Expression and Accessory are large/open
 * label sets (21/17/14/7/15 options). We keep them as strings so the API stays
 * the source of truth rather than hardcoding the full enumerations.
 */
export interface NormieTraits {
  type: NormieType;
  gender: NormieGender;
  age: NormieAge;
  hairStyle: string;
  facialFeature: string;
  eyes: string;
  expression: string;
  accessory: string;
  /** Any additional decoded fields the API returns are preserved here. */
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Raw `/traits` payload. The API returns human-readable labels; field naming
 * may vary slightly, so the pipeline normalizes it into {@link NormieTraits}.
 */
export interface RawTraitsResponse {
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Pixels
// ---------------------------------------------------------------------------

export const NORMIE_GRID_SIZE = 40;
export const NORMIE_PIXEL_COUNT = NORMIE_GRID_SIZE * NORMIE_GRID_SIZE; // 1600

/** Pixel "on" / "off" colors as documented. */
export const PIXEL_ON_COLOR = "#48494b"; // dark gray, bit = 1
export const PIXEL_OFF_COLOR = "#e3e5e4"; // light gray, bit = 0

/** A 1600-char string of '0'/'1', row-major, top-left to bottom-right. */
export type PixelString = string;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export interface MetadataAttribute {
  trait_type: string;
  value: string | number;
}

export interface NormieMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: MetadataAttribute[];
  level?: number;
  actionPoints?: number;
  customized?: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

export interface CanvasInfo {
  tokenId: number;
  level: number;
  actionPoints: number;
  customized: boolean;
  delegate?: string | null;
  [key: string]: unknown;
}

export interface CanvasDiff {
  tokenId: number;
  /** Indices (0..1599) of pixels that differ between original and canvas. */
  changedPixels?: number[];
  changedCount?: number;
  [key: string]: unknown;
}

export interface CanvasStatus {
  paused: boolean;
  burnTiers?: unknown;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

export interface OwnerResponse {
  tokenId: number;
  owner: string;
  [key: string]: unknown;
}

/** `/holders/{address}` — token IDs owned by a wallet. */
export type HoldingsResponse = number[];

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export interface BurnCommitment {
  commitId: string;
  timestamp?: number;
  tokenIds?: number[];
  [key: string]: unknown;
}

export interface BurnsPage {
  items: BurnCommitment[];
  limit: number;
  offset: number;
  total?: number;
  [key: string]: unknown;
}

export interface BurnedToken {
  tokenId: number;
  commitId?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export interface BurnedTokensPage {
  items: BurnedToken[];
  limit: number;
  offset: number;
  total?: number;
  [key: string]: unknown;
}

export interface NormieVersion {
  version: number;
  timestamp?: number;
  [key: string]: unknown;
}

export interface HistoryStats {
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Error shape
// ---------------------------------------------------------------------------

export class NormiesApiError extends Error {
  readonly status: number;
  readonly endpoint: string;

  constructor(message: string, status: number, endpoint: string) {
    super(message);
    this.name = "NormiesApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}
