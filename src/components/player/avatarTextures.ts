/**
 * Procedural textures for avatar materials — generated at runtime, no assets
 * and no network calls (keeps the game self-contained per the API-first rule).
 */
import * as THREE from "three";

/**
 * A tiling noise normal map used for the Cat "fur" material. Perturbs surface
 * normals slightly so flat voxel faces catch light like short fur.
 */
export function createFurNormalMap(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    // Mostly pointing up (z=255) with small random x/y tilt.
    const jitter = 38;
    data[i * 4 + 0] = 128 + Math.floor((Math.random() * 2 - 1) * jitter);
    data[i * 4 + 1] = 128 + Math.floor((Math.random() * 2 - 1) * jitter);
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.needsUpdate = true;
  return tex;
}

/**
 * An equirectangular gradient (deep space → midnight blue, with a cyan glow)
 * used as a scene environment so metallic (Agent) materials have something to
 * reflect without loading an external HDRI.
 */
export function createGradientEquirect(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Vertical base gradient.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#16335f"); // upper "sky"
  g.addColorStop(0.45, "#0a1230"); // midnight blue
  g.addColorStop(1, "#03040a"); // deep space black
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft cyan glow near the top — gives metals a highlight.
  const rg = ctx.createRadialGradient(w * 0.5, h * 0.28, 8, w * 0.5, h * 0.28, h * 0.7);
  rg.addColorStop(0, "rgba(79,195,247,0.55)");
  rg.addColorStop(1, "rgba(79,195,247,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
