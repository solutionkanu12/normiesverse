"use client";

/**
 * NexusPlaza — the walkable surface at the foot of the spire. A wide disc the
 * player stands on (so the 360-unit spire towers over them), ringed by a
 * glowing safety rail and lined with light pillars.
 *
 * Physics (fixed body):
 *   - floor disc collider
 *   - spire-base collider (can't walk through the spire)
 *   - perimeter rail (ring of cuboid colliders) so the player can't fall off
 */
import { useMemo } from "react";
import { CuboidCollider, CylinderCollider, RigidBody } from "@react-three/rapier";
import AmbientMotes from "@/components/shared/AmbientMotes";
import { HULL, NEXUS_COLORS, PLAZA } from "./nexusConstants";

const TWO_PI = Math.PI * 2;
const RAIL_SEGMENTS = 24;
const PILLARS = 8;

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

  const pillars = useMemo(() => {
    const r = PLAZA.railRadius - 1;
    return Array.from({ length: PILLARS }, (_, i) => {
      const a = (i / PILLARS) * TWO_PI + Math.PI / PILLARS;
      return [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number];
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

      {/* ── Light pillars ── */}
      {pillars.map((p, i) => (
        <group key={`pillar-${i}`} position={p}>
          <mesh position={[0, 4, 0]}>
            <boxGeometry args={[2.5, 8, 2.5]} />
            <meshStandardMaterial {...HULL.panel} />
          </mesh>
          <mesh position={[0, 8.5, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={NEXUS_COLORS.cyan} />
          </mesh>
          <pointLight position={[0, 8.5, 0]} color={NEXUS_COLORS.cyan} intensity={1.2} distance={40} />
        </group>
      ))}
    </group>
  );
}
