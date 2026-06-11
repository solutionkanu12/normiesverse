/**
 * portalGate — Nexus portal unlock rules. Recovering a world's Reality Core
 * (saved to usePlayerStore.realityCores via CORE_ID) unlocks the next portal
 * in the Nexus, per CLAUDE.md's "Unlock next portal in Nexus" rule.
 */
import type { WorldKind } from "@/store/useWorldStore";
import { CORE_ID } from "@/systems/world/WorldFactory";

/** Portal unlock order — matches PORTALS in nexusConstants (cyberpunk → frozen → void). */
export const PORTAL_ORDER: WorldKind[] = ["cyberpunk", "frozen", "void"];

/** The first portal is always open; each later portal needs the previous world's Reality Core. */
export function isPortalUnlocked(kind: WorldKind, realityCores: number[]): boolean {
  const idx = PORTAL_ORDER.indexOf(kind);
  if (idx <= 0) return true;
  const prev = PORTAL_ORDER[idx - 1];
  return realityCores.includes(CORE_ID[prev]);
}

/** The world kind whose portal unlocks immediately after `kind`'s core is recovered, if any. */
export function nextPortalAfter(kind: WorldKind): WorldKind | null {
  const idx = PORTAL_ORDER.indexOf(kind);
  if (idx < 0 || idx + 1 >= PORTAL_ORDER.length) return null;
  return PORTAL_ORDER[idx + 1];
}

/** The world kind whose Reality Core gates `kind`'s portal, if any. */
export function previousPortal(kind: WorldKind): WorldKind | null {
  const idx = PORTAL_ORDER.indexOf(kind);
  if (idx <= 0) return null;
  return PORTAL_ORDER[idx - 1];
}
