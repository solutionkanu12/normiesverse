"use client";

/**
 * NexusStation — the colossal central megastructure: a ~360-unit spire, a
 * habitation torus with spokes, a tilted outer ring, six docking arms with lit
 * pads, energy conduits, and a pulsing energy core at the heart.
 *
 * Geometry/scale mirror normiesverse-landing.html exactly. The whole station
 * slowly spins; the core, conduits and pad lights pulse.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HULL, NEXUS_COLORS } from "./nexusConstants";

const TWO_PI = Math.PI * 2;

export default function NexusStation() {
  const stationRef = useRef<THREE.Group>(null);
  const dockGroupRef = useRef<THREE.Group>(null);
  const outerRingRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const coreHaloRef = useRef<THREE.Mesh>(null);
  const coreLightRef = useRef<THREE.PointLight>(null);
  const conduitMats = useRef<THREE.MeshBasicMaterial[]>([]);
  const padMats = useRef<THREE.MeshBasicMaterial[]>([]);

  // Conduit transforms (12 lines up the spire).
  const conduits = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * TWO_PI;
        return [Math.cos(a) * 30, 150, Math.sin(a) * 30] as [number, number, number];
      }),
    [],
  );

  // Spokes connecting the great ring to the spire (8).
  const spokes = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * TWO_PI;
        return { pos: [Math.cos(a) * 68, 90, Math.sin(a) * 68] as [number, number, number], rotY: -a };
      }),
    [],
  );

  // Six docking arms.
  const docks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * TWO_PI;
        return { pos: [Math.cos(a) * 130, 90, Math.sin(a) * 130] as [number, number, number], rotY: -a };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (stationRef.current) stationRef.current.rotation.y = t * 0.02;
    if (dockGroupRef.current) dockGroupRef.current.rotation.y = t * 0.015;
    if (outerRingRef.current) outerRingRef.current.rotation.z = t * 0.05;

    // Energy core pulse.
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.2);
    if (coreRef.current) coreRef.current.scale.setScalar(pulse);
    if (coreHaloRef.current) coreHaloRef.current.scale.setScalar(1 + 0.1 * Math.sin(t * 1.6));
    if (coreLightRef.current) coreLightRef.current.intensity = 3.5 + Math.sin(t * 2.2);

    // Conduits + docking pad lights breathe.
    for (let i = 0; i < conduitMats.current.length; i++) {
      const m = conduitMats.current[i];
      if (m) m.opacity = 0.6 + 0.4 * Math.sin(t * 3 + i * 0.5);
    }
    for (let i = 0; i < padMats.current.length; i++) {
      const m = padMats.current[i];
      if (m) m.opacity = 0.6 + 0.4 * Math.sin(t * 2 + i * 1.1);
    }
  });

  return (
    <group ref={stationRef} name="nexus-station">
      {/* ── Central spire (rises to ~355u) ── */}
      <mesh position={[0, 35, 0]}>
        <cylinderGeometry args={[34, 52, 70, 12]} />
        <meshStandardMaterial {...HULL.mid} />
      </mesh>
      <mesh position={[0, 135, 0]}>
        <cylinderGeometry args={[22, 34, 130, 12]} />
        <meshStandardMaterial {...HULL.panel} />
      </mesh>
      <mesh position={[0, 255, 0]}>
        <cylinderGeometry args={[8, 22, 120, 10]} />
        <meshStandardMaterial {...HULL.dark} />
      </mesh>
      <mesh position={[0, 335, 0]}>
        <coneGeometry args={[8, 40, 10]} />
        <meshStandardMaterial {...HULL.mid} />
      </mesh>

      {/* ── Energy conduits up the spire ── */}
      {conduits.map((pos, i) => (
        <mesh key={`conduit-${i}`} position={pos}>
          <boxGeometry args={[1.2, 290, 1.2]} />
          <meshBasicMaterial
            color={NEXUS_COLORS.cyan}
            transparent
            ref={(m) => {
              if (m) conduitMats.current[i] = m;
            }}
          />
        </mesh>
      ))}

      {/* ── Great habitation ring + glow ── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 90, 0]}>
        <torusGeometry args={[130, 8, 16, 80]} />
        <meshStandardMaterial {...HULL.panel} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 90, 0]}>
        <torusGeometry args={[130, 2.2, 8, 80]} />
        <meshBasicMaterial color={NEXUS_COLORS.cyan2} />
      </mesh>

      {/* ── Spokes ── */}
      {spokes.map((s, i) => (
        <mesh key={`spoke-${i}`} position={s.pos} rotation={[0, s.rotY, 0]}>
          <boxGeometry args={[120, 4, 6]} />
          <meshStandardMaterial {...HULL.dark} />
        </mesh>
      ))}

      {/* ── Tilted outer ring + glow (spins) ── */}
      <group ref={outerRingRef} position={[0, 110, 0]} rotation={[Math.PI / 2.3, 0, 0]}>
        <mesh>
          <torusGeometry args={[200, 5, 12, 90]} />
          <meshStandardMaterial {...HULL.mid} />
        </mesh>
        <mesh>
          <torusGeometry args={[200, 1.4, 8, 90]} />
          <meshBasicMaterial color={NEXUS_COLORS.gold} />
        </mesh>
      </group>

      {/* ── Docking arms with lit pads ── */}
      <group ref={dockGroupRef}>
        {docks.map((d, i) => (
          <group key={`dock-${i}`} position={d.pos} rotation={[0, d.rotY, 0]}>
            <mesh position={[45, 0, 0]}>
              <boxGeometry args={[90, 5, 10]} />
              <meshStandardMaterial {...HULL.panel} />
            </mesh>
            <mesh position={[92, 0, 0]}>
              <cylinderGeometry args={[22, 24, 4, 8]} />
              <meshStandardMaterial {...HULL.mid} />
            </mesh>
            <mesh position={[92, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[20, 0.9, 6, 24]} />
              <meshBasicMaterial
                color={NEXUS_COLORS.cyan}
                transparent
                ref={(m) => {
                  if (m) padMats.current[i] = m;
                }}
              />
            </mesh>
            {/* landing beacon */}
            <mesh position={[92, 32, 0]}>
              <cylinderGeometry args={[0.6, 3, 60, 6]} />
              <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.12} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── Glowing energy core (heart) ── */}
      <mesh ref={coreRef} position={[0, 90, 0]}>
        <icosahedronGeometry args={[14, 1]} />
        <meshBasicMaterial color={NEXUS_COLORS.cyan2} transparent opacity={0.9} />
      </mesh>
      <mesh ref={coreHaloRef} position={[0, 90, 0]}>
        <sphereGeometry args={[22, 24, 24]} />
        <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.12} />
      </mesh>
      <pointLight ref={coreLightRef} position={[0, 90, 0]} color={NEXUS_COLORS.cyan} intensity={4} distance={600} />
    </group>
  );
}
