"use client";

/**
 * Portal — a gateway ring to one of the generated universes (Phase 8).
 *
 * Built from primitives, matching the NexusStation aesthetic: a large emissive
 * torus ring, an additive-blended glow disc, concentric "vortex" rings that
 * counter-rotate, and a sparse particle field orbiting the rim. Everything
 * pulses; when `active` (player within trigger range) the glow intensifies.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32, PORTAL, type PortalDef } from "./nexusConstants";

interface PortalProps {
  def: PortalDef;
  /** True while the player is within interaction range. */
  active?: boolean;
  /** True if the previous world's Reality Core hasn't been recovered yet — dims the portal. */
  locked?: boolean;
}

const PARTICLE_COUNT = 90;
const VORTEX_RINGS = [0, 1, 2] as const;

/** Dim, desaturated color for portals whose prerequisite Reality Core is missing. */
const LOCKED_COLOR = 0x4a505c;

export default function Portal({ def, active = false, locked = false }: PortalProps) {
  const color = locked ? LOCKED_COLOR : def.color;
  const ringRef = useRef<THREE.Mesh>(null);
  const fillMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const vortexRefs = useRef<(THREE.Mesh | null)[]>([]);
  const particlesRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Rim particles, scattered around the ring radius with a little jitter.
  // Seeded per-portal (by color) so the layout is stable across re-renders.
  const particleGeometry = useMemo(() => {
    const rand = mulberry32(def.color);
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = PORTAL.ringRadius + (rand() - 0.5) * 1.6;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (rand() - 0.5) * 1.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [def.color]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.75 + 0.25 * Math.sin(t * 2.4);

    if (locked) {
      if (fillMatRef.current) fillMatRef.current.opacity = 0.12 * pulse + 0.04;
      if (lightRef.current) lightRef.current.intensity = 0.6 + Math.sin(t * 2.4) * 0.2;
    } else {
      if (fillMatRef.current) fillMatRef.current.opacity = (active ? 0.55 : 0.35) * pulse + 0.1;
      if (lightRef.current) lightRef.current.intensity = (active ? 5 : 2.5) + Math.sin(t * 2.4) * 1.2;
    }
    if (ringRef.current) {
      const s = active && !locked ? 1.04 + Math.sin(t * 3) * 0.015 : 1;
      ringRef.current.scale.setScalar(s);
    }
    vortexRefs.current.forEach((m, i) => {
      if (!m) return;
      const dir = i % 2 === 0 ? 1 : -1;
      m.rotation.z = t * (0.4 + i * 0.25) * dir;
    });
    if (particlesRef.current) particlesRef.current.rotation.z = t * 0.15;
  });

  return (
    <group position={def.position} rotation={[0, def.rotationY, 0]} name={`portal-${def.id}`}>
      {/* Outer ring */}
      <mesh ref={ringRef} castShadow>
        <torusGeometry args={[PORTAL.ringRadius, PORTAL.tubeRadius, 16, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={locked ? 0.25 : active ? 1.6 : 0.9}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Glowing fill */}
      <mesh>
        <circleGeometry args={[PORTAL.ringRadius - PORTAL.tubeRadius * 0.6, 48]} />
        <meshBasicMaterial
          ref={fillMatRef}
          color={color}
          transparent
          opacity={locked ? 0.16 : 0.4}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Inner vortex rings, counter-rotating */}
      {VORTEX_RINGS.map((i) => (
        <mesh
          key={`vortex-${i}`}
          ref={(m) => {
            vortexRefs.current[i] = m;
          }}
        >
          <ringGeometry args={[PORTAL.ringRadius * (0.3 + i * 0.2), PORTAL.ringRadius * (0.32 + i * 0.2), 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={(locked ? 0.4 : 1) * (0.35 - i * 0.08)}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Rim particles */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial
          color={color}
          size={0.35}
          transparent
          opacity={locked ? 0.3 : 0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Glow light */}
      <pointLight ref={lightRef} color={color} intensity={locked ? 0.6 : 2.5} distance={50} />
    </group>
  );
}
