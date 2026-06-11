/**
 * Normies API client — https://api.normies.art
 *
 * Every endpoint documented in CLAUDE.md is exposed here, fully typed. All
 * traffic flows through:
 *   - {@link normiesRateLimiter}: enforces 60 req/min (sliding window).
 *   - {@link normiesCache}: TTL cache + single-flight de-duplication.
 *
 * No API key required. This module is the ONLY place that talks to the network
 * for Normie data — game systems consume it, never `fetch` directly.
 */

import { normiesCache, TTL } from "./apiCache";
import { normiesRateLimiter } from "./rateLimiter";
import {
  NormiesApiError,
  type BurnCommitment,
  type BurnedTokensPage,
  type BurnsPage,
  type CanvasDiff,
  type CanvasInfo,
  type CanvasStatus,
  type HistoryStats,
  type HoldingsResponse,
  type NormieMetadata,
  type NormieTraits,
  type NormieType,
  type NormieGender,
  type NormieAge,
  type NormieVersion,
  type OwnerResponse,
  type PaginationParams,
  type PixelString,
  type RawTraitsResponse,
} from "./types";

export const NORMIES_API_BASE = "https://api.normies.art";

const MIN_ID = 0;
const MAX_ID = 9999;

type ResponseKind = "json" | "text";

/** Validate a token ID, mirroring the API's 400 contract (0–9999). */
function assertValidId(id: number): void {
  if (!Number.isInteger(id) || id < MIN_ID || id > MAX_ID) {
    throw new NormiesApiError(
      `Invalid token ID ${id} (must be integer 0–9999)`,
      400,
      `/normie/${id}`,
    );
  }
}

/**
 * Low-level fetch: rate-limited, with typed error mapping. Not cached — the
 * caching wrappers below decide TTLs. Always goes through the limiter so we
 * never exceed the budget, even for uncached one-off calls.
 */
async function request(
  path: string,
  kind: ResponseKind,
  init?: RequestInit,
): Promise<unknown> {
  await normiesRateLimiter.acquire();

  const url = `${NORMIES_API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { Accept: kind === "json" ? "application/json" : "*/*", ...init?.headers },
    });
  } catch (cause) {
    throw new NormiesApiError(
      `Network error calling ${path}: ${(cause as Error)?.message ?? cause}`,
      0,
      path,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new NormiesApiError(
      `${res.status} ${res.statusText} for ${path}${body ? ` — ${body.slice(0, 200)}` : ""}`,
      res.status,
      path,
    );
  }

  return kind === "json" ? res.json() : res.text();
}

/** Cached JSON GET. */
function getJson<T>(path: string, ttlMs: number): Promise<T> {
  return normiesCache.fetch<T>(`json:${path}`, () => request(path, "json") as Promise<T>, ttlMs);
}

/** Cached text GET (pixels, SVG, hex). */
function getText(path: string, ttlMs: number): Promise<string> {
  return normiesCache.fetch<string>(`text:${path}`, () => request(path, "text") as Promise<string>, ttlMs);
}

function pageQuery({ limit, offset }: PaginationParams = {}): string {
  const params = new URLSearchParams();
  if (limit != null) params.set("limit", String(limit));
  if (offset != null) params.set("offset", String(offset));
  const q = params.toString();
  return q ? `?${q}` : "";
}

// ---------------------------------------------------------------------------
// Trait normalization
// ---------------------------------------------------------------------------

/**
 * Coerce a raw `/traits` payload into the canonical {@link NormieTraits} shape.
 *
 * The API returns human-readable labels but the exact key casing isn't
 * guaranteed, so we match case-insensitively and also accept an
 * `attributes: [{trait_type,value}]` form.
 */
export function normalizeTraits(raw: RawTraitsResponse): NormieTraits {
  const flat: Record<string, string> = {};

  // Accept either a flat object or an attributes array.
  const attrs = (raw as { attributes?: unknown }).attributes;
  if (Array.isArray(attrs)) {
    for (const a of attrs) {
      const t = (a as { trait_type?: unknown }).trait_type;
      const v = (a as { value?: unknown }).value;
      if (typeof t === "string" && v != null) flat[t.toLowerCase()] = String(v);
    }
  }
  for (const [k, v] of Object.entries(raw)) {
    if (k === "attributes") continue;
    if (v != null && typeof v !== "object") flat[k.toLowerCase()] = String(v);
  }

  const pick = (...keys: string[]): string => {
    for (const key of keys) {
      const hit = flat[key.toLowerCase()];
      if (hit != null) return hit;
    }
    return "";
  };

  return {
    type: (pick("type") || "Human") as NormieType,
    gender: (pick("gender") || "Non-Binary") as NormieGender,
    age: (pick("age") || "Young") as NormieAge,
    hairStyle: pick("hair style", "hairStyle", "hair"),
    facialFeature: pick("facial feature", "facialFeature", "facial"),
    eyes: pick("eyes"),
    expression: pick("expression"),
    accessory: pick("accessory"),
    ...flat,
  };
}

// ===========================================================================
// Core endpoints
// ===========================================================================

/** 40×40 bitmap as a 1600-char '0'/'1' string (composited). */
export function getPixels(id: number): Promise<PixelString> {
  assertValidId(id);
  return getText(`/normie/${id}/pixels`, TTL.STATIC);
}

/** Decoded, human-readable traits, normalized to {@link NormieTraits}. */
export async function getTraits(id: number): Promise<NormieTraits> {
  assertValidId(id);
  const raw = await getJson<RawTraitsResponse>(`/normie/${id}/traits`, TTL.STATIC);
  return normalizeTraits(raw);
}

/** Raw bytes8 trait data as a hex string. */
export function getTraitsBinary(id: number): Promise<string> {
  assertValidId(id);
  return getText(`/normie/${id}/traits/binary`, TTL.STATIC);
}

/** SVG markup (composited). */
export function getImageSvg(id: number): Promise<string> {
  assertValidId(id);
  return getText(`/normie/${id}/image.svg`, TTL.STATIC);
}

/** Absolute URL to the 1000×1000 PNG (composited). */
export function getImagePngUrl(id: number): string {
  assertValidId(id);
  return `${NORMIES_API_BASE}/normie/${id}/image.png`;
}

/** Full NFT metadata (V4 renderer): Level, Action Points, Customized, etc. */
export function getMetadata(id: number): Promise<NormieMetadata> {
  assertValidId(id);
  return getJson<NormieMetadata>(`/normie/${id}/metadata`, TTL.CANVAS);
}

/** Pre-Canvas pixels. */
export function getOriginalPixels(id: number): Promise<PixelString> {
  assertValidId(id);
  return getText(`/normie/${id}/original/pixels`, TTL.STATIC);
}

/** Pre-Canvas SVG. */
export function getOriginalImageSvg(id: number): Promise<string> {
  assertValidId(id);
  return getText(`/normie/${id}/original/image.svg`, TTL.STATIC);
}

/** Absolute URL to the pre-Canvas PNG. */
export function getOriginalImagePngUrl(id: number): string {
  assertValidId(id);
  return `${NORMIES_API_BASE}/normie/${id}/original/image.png`;
}

// ===========================================================================
// Ownership endpoints
// ===========================================================================

/** Current owner (throws NormiesApiError 404 if burned/unminted). */
export function getOwner(id: number): Promise<OwnerResponse> {
  assertValidId(id);
  return getJson<OwnerResponse>(`/normie/${id}/owner`, TTL.OWNERSHIP);
}

/** All Normie token IDs owned by a wallet address. */
export function getHoldings(address: string): Promise<HoldingsResponse> {
  if (!address) {
    throw new NormiesApiError("Address is required", 400, "/holders");
  }
  return getJson<HoldingsResponse>(`/holders/${address}`, TTL.OWNERSHIP);
}

// ===========================================================================
// Canvas endpoints
// ===========================================================================

/** Transform layer (XOR overlay) as a binary string. */
export function getCanvasPixels(id: number): Promise<PixelString> {
  assertValidId(id);
  return getText(`/normie/${id}/canvas/pixels`, TTL.CANVAS);
}

/** Pixel-level diff between original and Canvas edits. */
export function getCanvasDiff(id: number): Promise<CanvasDiff> {
  assertValidId(id);
  return getJson<CanvasDiff>(`/normie/${id}/canvas/diff`, TTL.CANVAS);
}

/** Action points, level, customization status, delegate info. */
export function getCanvasInfo(id: number): Promise<CanvasInfo> {
  assertValidId(id);
  return getJson<CanvasInfo>(`/normie/${id}/canvas/info`, TTL.CANVAS);
}

/** Global Canvas contract status (paused, burn tiers). */
export function getCanvasStatus(): Promise<CanvasStatus> {
  return getJson<CanvasStatus>(`/canvas/status`, TTL.SHORT);
}

// ===========================================================================
// History endpoints
// ===========================================================================

/** Burn commitments, paginated, newest first. */
export function getBurns(params?: PaginationParams): Promise<BurnsPage> {
  return getJson<BurnsPage>(`/history/burns${pageQuery(params)}`, TTL.HISTORY);
}

/** Single burn commitment with burned token details. */
export function getBurn(commitId: string): Promise<BurnCommitment> {
  return getJson<BurnCommitment>(`/history/burns/${commitId}`, TTL.HISTORY);
}

/** All individually burned tokens, paginated. */
export function getBurnedTokens(params?: PaginationParams): Promise<BurnedTokensPage> {
  return getJson<BurnedTokensPage>(`/history/burned-tokens${pageQuery(params)}`, TTL.HISTORY);
}

/** SVG of a burned Normie (persists on-chain). */
export function getBurnedImageSvg(tokenId: number): Promise<string> {
  assertValidId(tokenId);
  return getText(`/history/burned/${tokenId}/image.svg`, TTL.STATIC);
}

/** All transform versions (pixel change history) for a Normie. */
export function getVersions(id: number): Promise<NormieVersion[]> {
  assertValidId(id);
  return getJson<NormieVersion[]>(`/history/normie/${id}/versions`, TTL.HISTORY);
}

/** Historical version SVG. */
export function getVersionImageSvg(id: number, version: number): Promise<string> {
  assertValidId(id);
  return getText(`/history/normie/${id}/version/${version}/image.svg`, TTL.STATIC);
}

/** Global Canvas activity statistics. */
export function getHistoryStats(): Promise<HistoryStats> {
  return getJson<HistoryStats>(`/history/stats`, TTL.HISTORY);
}

// ---------------------------------------------------------------------------
// Aggregate export (convenient namespace import: `import { normiesApi } ...`)
// ---------------------------------------------------------------------------

export const normiesApi = {
  // core
  getPixels,
  getTraits,
  getTraitsBinary,
  getImageSvg,
  getImagePngUrl,
  getMetadata,
  getOriginalPixels,
  getOriginalImageSvg,
  getOriginalImagePngUrl,
  // ownership
  getOwner,
  getHoldings,
  // canvas
  getCanvasPixels,
  getCanvasDiff,
  getCanvasInfo,
  getCanvasStatus,
  // history
  getBurns,
  getBurn,
  getBurnedTokens,
  getBurnedImageSvg,
  getVersions,
  getVersionImageSvg,
  getHistoryStats,
  // utils
  normalizeTraits,
} as const;

export default normiesApi;
