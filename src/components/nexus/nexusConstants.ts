/**
 * Shared constants for the Nexus — colors, hull material presets, and scene
 * scale. Values are lifted directly from normiesverse-landing.html so the R3F
 * scene matches the reference visual identity and (colossal) scale exactly.
 */
import type { WorldKind } from "@/store/useWorldStore";

export const NEXUS_COLORS = {
  black: 0x03040a,
  fog: 0x04060f,
  hullDark: 0x0c1224,
  hullMid: 0x141d38,
  hullPanel: 0x1b2747,
  cyan: 0x4fc3f7,
  cyan2: 0x00e5ff,
  gold: 0xc9a84c,
  green: 0x00ff9d,
  orange: 0xff6633,
  star: 0xaabbff,
} as const;

/** Hull MeshStandardMaterial presets (spread into <meshStandardMaterial />). */
export const HULL = {
  dark: { color: 0x0c1224, metalness: 0.85, roughness: 0.45, emissive: 0x05080f },
  mid: { color: 0x141d38, metalness: 0.9, roughness: 0.35, emissive: 0x070c1a },
  panel: { color: 0x1b2747, metalness: 0.95, roughness: 0.25, emissive: 0x0a1428 },
} as const;

/** Fog distances (near, far) — far structures fade into the void. */
export const NEXUS_FOG = { near: 120, far: 850 } as const;

/** Walkable plaza ring around the spire base. */
export const PLAZA = {
  radius: 110,
  innerRadius: 56, // clears the spire base footprint
  railRadius: 107,
  railHeight: 3,
  y: 0,
} as const;

/** Player spawn + NPC guide positions (on the plaza). */
export const SPAWN: [number, number, number] = [0, 2.2, 92];
export const GUIDE_POS: [number, number, number] = [7, 0, 72];
/** Distance at which the guide's dialogue triggers. */
export const GUIDE_TRIGGER_RADIUS = 12;

/** Deterministic PRNG (mulberry32) so the scene looks identical every load. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Convert a Three.js numeric hex color (e.g. NEXUS_COLORS.cyan) to CSS. */
export function cssColor(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}

// ---------------------------------------------------------------------------
// Portals — gateways to the generated universes (Phase 8 builds the worlds).
// ---------------------------------------------------------------------------

export interface PortalDef {
  id: WorldKind;
  label: string;
  /** Numeric hex (Three.js material color). */
  color: number;
  position: [number, number, number];
  rotationY: number;
}

export const PORTAL = {
  ringRadius: 7,
  tubeRadius: 0.7,
  /** Distance at which "Press E to Enter" appears. */
  triggerRadius: 5,
} as const;

const PORTAL_RING_FROM_CENTER = 80;
const PORTAL_Y = PORTAL.ringRadius + PORTAL.tubeRadius;

/** Position + facing for a portal placed `angleDeg` around the plaza, facing the spire. */
function portalTransform(angleDeg: number): Pick<PortalDef, "position" | "rotationY"> {
  const a = (angleDeg * Math.PI) / 180;
  return {
    position: [Math.sin(a) * PORTAL_RING_FROM_CENTER, PORTAL_Y, Math.cos(a) * PORTAL_RING_FROM_CENTER],
    rotationY: a + Math.PI,
  };
}

/** The three portals around the plaza, one per universe. */
export const PORTALS: PortalDef[] = [
  { id: "cyberpunk", label: "Cyberpunk Reality", color: NEXUS_COLORS.orange, ...portalTransform(60) },
  { id: "frozen", label: "Frozen Reality", color: NEXUS_COLORS.cyan, ...portalTransform(180) },
  { id: "void", label: "Digital Void", color: NEXUS_COLORS.green, ...portalTransform(300) },
];
