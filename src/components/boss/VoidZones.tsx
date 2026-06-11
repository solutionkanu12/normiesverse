"use client";

/**
 * VoidZones — phase-3 hazard. Tears open in the platform floor; standing in
 * one drains the player's HP (the drain itself is applied by BossDirector —
 * this is the visual). Positions are the deterministic set generated from the
 * player's Normie, so the readers (director) and this renderer agree.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ARENA, BOSS_COLORS, type VoidZone } from "./bossConstants";

interface VoidZonesProps {
  zones: VoidZone[];
}

/** Platform surface Y (top of the slab). */
const SURFACE_Y = ARENA.halfHeight + 0.02;

function Zone({ zone }: { zone: VoidZone }) {
  const inner = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.6 + 0.4 * Math.sin(t * 3 + zone.x);
    const im = inner.current?.material as THREE.MeshBasicMaterial | undefined;
    if (im) im.opacity = 0.4 + pulse * 0.35;
    if (ring.current) ring.current.scale.setScalar(0.9 + pulse * 0.15);
  });

  return (
    <group position={[zone.x, SURFACE_Y, zone.z]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Dark void disc */}
      <mesh ref={inner}>
        <circleGeometry args={[zone.r, 40]} />
        <meshBasicMaterial color={BOSS_COLORS.voidBlack} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* Corruption rim */}
      <mesh ref={ring} position={[0, 0, 0.01]}>
        <ringGeometry args={[zone.r * 0.82, zone.r, 48]} />
        <meshBasicMaterial
          color={BOSS_COLORS.bloodRed}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Up-cast glow */}
      <pointLight color={BOSS_COLORS.bloodRed} intensity={1.6} distance={zone.r * 2.5} position={[0, 0, 1.5]} />
    </group>
  );
}

export default function VoidZones({ zones }: VoidZonesProps) {
  return (
    <group name="void-zones">
      {zones.map((z, i) => (
        <Zone key={i} zone={z} />
      ))}
    </group>
  );
}
