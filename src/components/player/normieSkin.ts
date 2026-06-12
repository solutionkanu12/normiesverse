/**
 * normieSkin — turns a Normie's 40×40 `/pixels` bitmap into per-body-part
 * textures + materials for the humanoid (Minecraft-Steve-style) avatar.
 *
 * Row → body-part mapping (per the Phase-5 spec):
 *   rows  0–7   → head        (full width)
 *   rows  8–19  → torso       (full width)
 *   rows 20–27  → arms        (left = cols 0–19, right = cols 20–39)
 *   rows 28–39  → legs        (left = cols 0–19, right = cols 20–39)
 *
 * Pixel colors are the documented on-chain palette:
 *   bit 1 → #48494b (dark)   bit 0 → #e3e5e4 (light)
 *
 * Textures are nearest-filtered DataTextures (no canvas/DOM needed, crisp
 * pixels). The exact bitmap is rendered — never approximated. Type drives the
 * surface (matte / fur / emissive / reflective); the bitmap is always the map.
 */
import * as THREE from "three";
import { NORMIE_GRID_SIZE } from "@/api/types";
import { parsePixels } from "@/systems/normie/PixelAnalyzer";
import type { MaterialConfig } from "@/systems/normie/avatar.types";
import { createFurNormalMap } from "./avatarTextures";

const GRID = NORMIE_GRID_SIZE; // 40
const DARK: readonly [number, number, number] = [0x48, 0x49, 0x4b];
const LIGHT: readonly [number, number, number] = [0xe3, 0xe5, 0xe4];

// ---------------------------------------------------------------------------
// Minecraft-Steve proportions (in "units"; one unit = UNIT world units).
// ---------------------------------------------------------------------------

/** World scale of one proportion unit → ~1.84u tall (fits the player capsule). */
export const UNIT = 0.0575;

export const BODY = {
  head: { w: 8, h: 8, d: 8 },
  torso: { w: 8, h: 12, d: 4 },
  arm: { w: 4, h: 12, d: 4 },
  leg: { w: 4, h: 12, d: 4 },
  /** Key heights (units, measured from the feet at y=0). */
  hipY: 12, // top of legs / bottom of torso → leg + upper-body pivot
  neckY: 24, // top of torso → head + shoulder pivot
  totalH: 32, // legs(12) + torso(12) + head(8)
  /** Horizontal offsets (units) of limb centers from the body centerline. */
  legX: 2, // two 4-wide legs side by side → centers at ±2
  armX: 6, // torso half-width (4) + arm half-width (2)
} as const;

// ---------------------------------------------------------------------------
// Body-part regions (shared with normieImageSkin)
// ---------------------------------------------------------------------------

/** A band of the 40×40 grid: rows [r0,r1) × cols [c0,c1). */
export interface SkinRegion {
  r0: number;
  r1: number;
  c0: number;
  c1: number;
}

/**
 * Row/column bands mapping the bitmap (and, for normieImageSkin, the
 * composited NFT image) onto the avatar's body parts. Arms/legs split into
 * left/right column halves.
 */
export const SKIN_REGIONS: Record<"head" | "torso" | "armL" | "armR" | "legL" | "legR", SkinRegion> = {
  head: { r0: 0, r1: 8, c0: 0, c1: GRID },
  torso: { r0: 8, r1: 20, c0: 0, c1: GRID },
  armL: { r0: 20, r1: 28, c0: 0, c1: GRID / 2 },
  armR: { r0: 20, r1: 28, c0: GRID / 2, c1: GRID },
  legL: { r0: 28, r1: 40, c0: 0, c1: GRID / 2 },
  legR: { r0: 28, r1: 40, c0: GRID / 2, c1: GRID },
};

// ---------------------------------------------------------------------------
// Texture building
// ---------------------------------------------------------------------------

/** Read the bit at (row,col); out-of-range or invalid → off (light). */
function bitAt(cells: boolean[], row: number, col: number): boolean {
  if (row < 0 || row >= GRID || col < 0 || col >= GRID) return false;
  return cells[row * GRID + col] === true;
}

/**
 * Build a nearest-filtered texture for the bitmap region rows [r0,r1) ×
 * cols [c0,c1). The region is flipped vertically so bitmap row r0 (the top of
 * that band) lands at the top of the textured face.
 */
function regionTexture(cells: boolean[], { r0, r1, c0, c1 }: SkinRegion): THREE.DataTexture {
  const w = c1 - c0;
  const h = r1 - r0;
  const data = new Uint8Array(w * h * 4);
  for (let ty = 0; ty < h; ty++) {
    const bitRow = r1 - 1 - ty; // flip Y (DataTexture origin is bottom-left)
    for (let tx = 0; tx < w; tx++) {
      const on = bitAt(cells, bitRow, c0 + tx);
      const [r, g, b] = on ? DARK : LIGHT;
      const di = (ty * w + tx) * 4;
      data[di] = r;
      data[di + 1] = g;
      data[di + 2] = b;
      data[di + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

/** Build the part material: `map` (bitmap or NFT-image region), surface from the Type config. */
export function makeMaterial(
  map: THREE.Texture,
  config: MaterialConfig,
  auraIntensity: number,
  accent: string,
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    map,
    roughness: config.roughness,
    metalness: config.metalness,
  });

  if (config.kind === "fur") {
    mat.normalMap = createFurNormalMap();
    const ns = config.normalScale ?? 0.7;
    mat.normalScale = new THREE.Vector2(ns, ns);
  }

  if (config.kind === "emissive") {
    // Alien: the bitmap self-illuminates in the accent color.
    mat.emissive = new THREE.Color(accent);
    mat.emissiveMap = map;
    mat.emissiveIntensity = (config.emissiveIntensity ?? 1) * (0.45 + auraIntensity * 0.25);
  }

  if (config.kind === "reflective") {
    mat.envMapIntensity = 1.4;
  }

  return mat;
}

export interface NormieSkin {
  head: THREE.MeshStandardMaterial;
  torso: THREE.MeshStandardMaterial;
  armL: THREE.MeshStandardMaterial;
  armR: THREE.MeshStandardMaterial;
  legL: THREE.MeshStandardMaterial;
  legR: THREE.MeshStandardMaterial;
  /** Dispose every texture + material this skin owns. */
  dispose(): void;
}

/**
 * Build the full set of body-part materials from the bitmap. Works for any
 * Normie ID 0–9999; an invalid/short bitmap falls back to all-light skin so
 * the avatar still renders.
 */
export function buildSkin(
  pixels: string,
  config: MaterialConfig,
  auraIntensity: number,
  accent: string,
): NormieSkin {
  let cells: boolean[];
  try {
    cells = parsePixels(pixels).cells;
  } catch {
    cells = new Array<boolean>(GRID * GRID).fill(false);
  }

  // Row bands → part regions. Arms/legs split into left/right column halves.
  const head = regionTexture(cells, SKIN_REGIONS.head);
  const torso = regionTexture(cells, SKIN_REGIONS.torso);
  const armLTex = regionTexture(cells, SKIN_REGIONS.armL);
  const armRTex = regionTexture(cells, SKIN_REGIONS.armR);
  const legLTex = regionTexture(cells, SKIN_REGIONS.legL);
  const legRTex = regionTexture(cells, SKIN_REGIONS.legR);

  const textures = [head, torso, armLTex, armRTex, legLTex, legRTex];
  const materials = textures.map((t) => makeMaterial(t, config, auraIntensity, accent));
  const [mHead, mTorso, mArmL, mArmR, mLegL, mLegR] = materials;

  return {
    head: mHead,
    torso: mTorso,
    armL: mArmL,
    armR: mArmR,
    legL: mLegL,
    legR: mLegR,
    dispose() {
      for (const m of materials) {
        m.normalMap?.dispose();
        m.dispose();
      }
      for (const t of textures) t.dispose();
    },
  };
}
