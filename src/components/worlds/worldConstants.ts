/**
 * Shared constants + helpers for the generated worlds (Phase 7).
 */

/** Per-world gravity (void is lighter so platform hops feel floaty). */
export const WORLD_GRAVITY: Record<string, [number, number, number]> = {
  cyberpunk: [0, -26, 0],
  frozen: [0, -24, 0],
  void: [0, -18, 0],
};

/** Distance at which the Reality Core is auto-collected. */
export const CORE_COLLECT_RADIUS = 3.2;

/** Void platform half-extents (a flat square tile). */
export const VOID_PLATFORM = { halfX: 3.4, halfY: 0.4, halfZ: 3.4 } as const;

/** Base hover height enemies patrol around, per world kind (void floats higher). */
export const ENEMY_BASE_Y: Record<string, number> = {
  void: 4,
};

/** Fallback enemy base height for kinds not listed in {@link ENEMY_BASE_Y}. */
export const DEFAULT_ENEMY_BASE_Y = 2.5;

/** Convert a numeric hex (0xrrggbb) to a CSS string. */
export function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, "0")}`;
}
