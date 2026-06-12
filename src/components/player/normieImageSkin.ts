/**
 * normieImageSkin — slices the composited Normie NFT image
 * (`/normie/{id}/image.png`) into the same body-part zones used by
 * normieSkin's bitmap fallback, so the avatar wears the actual NFT artwork:
 *   rows  0–7   → head        (full width)
 *   rows  8–19  → torso       (full width)
 *   rows 20–27  → arms        (left = cols 0–19, right = cols 20–39)
 *   rows 28–39  → legs        (left = cols 0–19, right = cols 20–39)
 *
 * Each zone is cropped onto its own canvas and used as a CanvasTexture, then
 * passed through normieSkin's makeMaterial so Type-driven surfaces (fur,
 * emissive, reflective) still apply.
 */
import * as THREE from "three";
import { NORMIE_GRID_SIZE } from "@/api/types";
import { getImagePngUrl } from "@/api/normiesApi";
import type { MaterialConfig } from "@/systems/normie/avatar.types";
import { SKIN_REGIONS, makeMaterial, type NormieSkin, type SkinRegion } from "./normieSkin";

const GRID = NORMIE_GRID_SIZE;

/** Crop one body-part zone out of the NFT image into its own texture. */
function regionFromImage(img: HTMLImageElement, { r0, r1, c0, c1 }: SkinRegion): THREE.CanvasTexture {
  const sx = (c0 / GRID) * img.naturalWidth;
  const sy = (r0 / GRID) * img.naturalHeight;
  const sw = ((c1 - c0) / GRID) * img.naturalWidth;
  const sh = ((r1 - r0) / GRID) * img.naturalHeight;

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

/**
 * Fetch the NFT image for `normieId` and build per-body-part materials from
 * its zones. Rejects on network/load failure — callers should fall back to
 * {@link import("./normieSkin").buildSkin}.
 */
export async function loadNormieImageSkin(
  normieId: number,
  config: MaterialConfig,
  auraIntensity: number,
  accent: string,
): Promise<NormieSkin> {
  const img = await loadImage(getImagePngUrl(normieId));

  const head = regionFromImage(img, SKIN_REGIONS.head);
  const torso = regionFromImage(img, SKIN_REGIONS.torso);
  const armLTex = regionFromImage(img, SKIN_REGIONS.armL);
  const armRTex = regionFromImage(img, SKIN_REGIONS.armR);
  const legLTex = regionFromImage(img, SKIN_REGIONS.legL);
  const legRTex = regionFromImage(img, SKIN_REGIONS.legR);

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
