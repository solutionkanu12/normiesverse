"use client";

/**
 * NexusPlaza — the walkable surface at the foot of the spire. A wide disc the
 * player stands on (so the 360-unit spire towers over them), ringed by a
 * glowing safety rail and enclosed by the Portal Chamber's colonnade.
 *
 * Physics (fixed body):
 *   - floor disc collider
 *   - spire-base collider (can't walk through the spire)
 *   - perimeter rail (ring of cuboid colliders) so the player can't fall off
 *   - colonnade columns (ring of cylinder colliders, see PortalChamber)
 */
import { useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import AmbientMotes from "@/components/shared/AmbientMotes";
import { CHAMBER, NEXUS_COLORS, PLAZA, PORTAL_ANGLES_DEG, chamberColumnPositions } from "./nexusConstants";

const TWO_PI = Math.PI * 2;
const RAIL_SEGMENTS = 24;
const DEG = Math.PI / 180;
const WALL_STEP_DEG = 15;
const WALL_PANEL_WIDTH = 22;

/** Shortest angular distance (deg) between two angles — mirrors PortalChamber. */
function angleDiffDeg(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

export default function NexusPlaza() {
  const railSegs = useMemo(() => {
    const r = PLAZA.railRadius;
    const halfW = ((TWO_PI * r) / RAIL_SEGMENTS / 2) * 1.06; // slight overlap
    return Array.from({ length: RAIL_SEGMENTS }, (_, i) => {
      const a = (i / RAIL_SEGMENTS) * TWO_PI;
      return {
        pos: [Math.cos(a) * r, PLAZA.railHeight / 2, Math.sin(a) * r] as [number, number, number],
        rotY: -a,
        halfW,
      };
    });
  }, []);

  const columnPositions = useMemo(() => chamberColumnPositions(CHAMBER.columnHeight / 2), []);

  // Portal Chamber wall panels (same placement as PortalChamber.WallPanels) —
  // every 15° around the portal ring, skipping the gate openings.
  const wallPanels = useMemo(() => {
    const out: { x: number; z: number; rot: number }[] = [];
    for (let deg = 0; deg < 360; deg += WALL_STEP_DEG) {
      const nearGate = PORTAL_ANGLES_DEG.some(
        (g) => angleDiffDeg(deg, g) <= CHAMBER.gateHalfAngleDeg + WALL_STEP_DEG / 2,
      );
      if (nearGate) continue;
      const a = deg * DEG;
      out.push({ x: Math.sin(a) * CHAMBER.wallRadius, z: Math.cos(a) * CHAMBER.wallRadius, rot: a });
    }
    return out;
  }, []);

  // Gate pylons flanking each portal opening (mirrors PortalChamber.GateFrames).
  const gatePylons = useMemo(() => {
    const r = CHAMBER.wallRadius;
    const delta = CHAMBER.gateHalfAngleDeg * DEG;
    return PORTAL_ANGLES_DEG.flatMap((deg) => {
      const a = deg * DEG;
      return [
        { x: Math.sin(a - delta) * r, z: Math.cos(a - delta) * r, rot: a },
        { x: Math.sin(a + delta) * r, z: Math.cos(a + delta) * r, rot: a },
      ];
    });
  }, []);

  return (
    <group name="nexus-plaza">
      {/* ── Physics colliders (invisible) ── */}
      <RigidBody type="fixed" colliders={false}>
        {/* floor: top surface at y = 0 */}
        <CylinderCollider args={[0.5, PLAZA.radius]} position={[0, -0.5, 0]} />
        {/* spire base obstacle */}
        <CylinderCollider args={[35, 54]} position={[0, 35, 0]} />
        {/* perimeter rail */}
        {railSegs.map((s, i) => (
          <CuboidCollider
            key={`rail-col-${i}`}
            args={[s.halfW, PLAZA.railHeight / 2 + 0.6, 0.4]}
            position={s.pos}
            rotation={[0, s.rotY, 0]}
          />
        ))}
        {/* portal chamber colonnade */}
        {columnPositions.map((p, i) => (
          <CylinderCollider
            key={`column-col-${i}`}
            args={[CHAMBER.columnHeight / 2, CHAMBER.columnRadiusXZ]}
            position={p}
          />
        ))}
        {/* portal chamber walls — block every arc except the gate openings */}
        {wallPanels.map((p, i) => (
          <CuboidCollider
            key={`wall-col-${i}`}
            args={[WALL_PANEL_WIDTH / 2, CHAMBER.wallHeight / 2, 1]}
            position={[p.x, CHAMBER.wallHeight / 2, p.z]}
            rotation={[0, p.rot, 0]}
          />
        ))}
        {/* gate pylons flanking each portal */}
        {gatePylons.map((p, i) => (
          <CuboidCollider
            key={`gate-col-${i}`}
            args={[2.5, CHAMBER.gateHeight / 2, 2.5]}
            position={[p.x, CHAMBER.gateHeight / 2, p.z]}
            rotation={[0, p.rot, 0]}
          />
        ))}
      </RigidBody>

      {/* ── Visual floor disc ── */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <cylinderGeometry args={[PLAZA.radius, PLAZA.radius + 4, 1, 64]} />
        <meshStandardMaterial color={0x0a1020} metalness={0.8} roughness={0.5} emissive={0x05080f} />
      </mesh>

      {/* glowing inlay rings on the floor */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PLAZA.radius - 8, 0.5, 8, 96]} />
        <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PLAZA.innerRadius + 6, 0.4, 8, 80]} />
        <meshBasicMaterial color={NEXUS_COLORS.cyan2} transparent opacity={0.4} />
      </mesh>

      {/* ── Visual rail ── */}
      <mesh position={[0, PLAZA.railHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PLAZA.railRadius, 0.3, 8, 96]} />
        <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.7} />
      </mesh>

      {/* Drifting energy motes over the plaza */}
      <AmbientMotes
        radius={PLAZA.railRadius * 0.95}
        height={26}
        color={NEXUS_COLORS.cyan2}
        count={200}
        size={0.32}
        opacity={0.4}
        rise={0.7}
        seed={0xbeef}
      />
    </group>
  );
}
