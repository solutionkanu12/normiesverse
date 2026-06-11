"use client";

/**
 * Portals — renders the three universe gateways around the plaza, marking
 * whichever one the player is currently standing near as `active`.
 */
import { usePlayerStore } from "@/store/usePlayerStore";
import type { WorldKind } from "@/store/useWorldStore";
import { isPortalUnlocked } from "@/systems/quest/portalGate";
import Portal from "./Portal";
import { PORTALS } from "./nexusConstants";

interface PortalsProps {
  nearPortalId: WorldKind | null;
}

export default function Portals({ nearPortalId }: PortalsProps) {
  const realityCores = usePlayerStore((s) => s.realityCores);

  return (
    <>
      {PORTALS.map((def) => (
        <Portal
          key={def.id}
          def={def}
          active={nearPortalId === def.id}
          locked={!isPortalUnlocked(def.id, realityCores)}
        />
      ))}
    </>
  );
}
