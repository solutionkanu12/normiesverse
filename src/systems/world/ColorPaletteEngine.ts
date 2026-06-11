/**
 * ColorPaletteEngine — derives a world's color palette from the Normie's
 * Type (base world) and Expression (accent hue).
 *
 * Per CLAUDE.md: Expression sets the color palette. We hash the Expression
 * label (an open 7-value set) into a deterministic hue, then fold it into a
 * base palette chosen by world kind. This keeps the API the source of truth —
 * the same Normie always yields the same palette, and a different Expression
 * shifts it — without hardcoding the full enumeration.
 */
import type { NormieTraits } from "@/api/types";
import type { WorldKind } from "@/store/useWorldStore";
import type { WorldPalette } from "./worldTypes";

/** Stable string hash (FNV-1a, 32-bit). */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** HSL (h 0..360, s/l 0..1) → "#rrggbb". */
export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Expression label → hue 0..360 (deterministic). */
export function expressionHue(expression: string): number {
  return hashString(expression || "neutral") % 360;
}

/**
 * Build the palette for a world. The accent hue comes from Expression; each
 * world kind constrains lightness/saturation and the surrounding base colors
 * to its theme (neon city / frozen tundra / digital void).
 */
export function buildPalette(kind: WorldKind, traits: NormieTraits): WorldPalette {
  const hue = expressionHue(traits.expression);

  switch (kind) {
    case "cyberpunk": {
      // Rain-soaked neon city: dark blue base, a vivid Expression-driven neon.
      const accent = hslToHex(hue, 1.0, 0.58);
      const secondary = hslToHex((hue + 150) % 360, 0.85, 0.55);
      return {
        background: "#05060f",
        fog: "#0a0c1c",
        fogNear: 18,
        fogFar: 150,
        primary: "#0c1024",
        secondary,
        accent,
        ambient: "#1a2348",
        key: "#3a4a88",
        particle: "#6fa8ff",
      };
    }

    case "frozen": {
      // Cold blue/white tundra under a deep-navy aurora sky. Expression nudges
      // the aurora accent within the cool half of the wheel.
      const auroraHue = 150 + (hue % 120); // 150..270 → teal→blue→violet
      const accent = hslToHex(auroraHue, 0.8, 0.62);
      return {
        background: "#040814",
        fog: "#0a1426",
        fogNear: 30,
        fogFar: 220,
        primary: "#cfe6ff",
        secondary: "#7fb0e0",
        accent,
        ambient: "#27406b",
        key: "#bfe0ff",
        particle: "#dff1ff",
      };
    }

    case "void":
    default: {
      // Pure darkness, matrix-green data streams. Expression tints the
      // secondary wireframe glow only — the streams stay #00ff9d.
      const secondary = hslToHex((hue + 90) % 360, 0.9, 0.5);
      return {
        background: "#000000",
        fog: "#000405",
        fogNear: 12,
        fogFar: 130,
        primary: "#03110b",
        secondary,
        accent: "#00ff9d",
        ambient: "#04140d",
        key: "#0aff9d",
        particle: "#00ff9d",
      };
    }
  }
}
