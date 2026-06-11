"use client";

/**
 * BossArena — a colossal floating platform adrift in deep space, the only
 * solid ground in the void. The slab has a Rapier cylinder collider; step off
 * the rim and you fall into the void (PlayerController respawns on fall). The
 * lighting is the spec's "deep red and void black": near-black ambient, blood-
 * red key + rim lights, a corruption glow rising from the floor.
 */
import { useMemo } from "react";
import { RigidBody, CylinderCollider } from "@react-three/rapier";
import * as THREE from "three";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import AmbientMotes from "@/components/shared/AmbientMotes";
import { ARENA, BOSS_COLORS } from "./bossConstants";

const STAR_COUNT = 1400;

/** Reddish deep-space starfield on a large surrounding shell. */
function Starfield() {
  const positions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3);
    const rng = mulberry32(0xc0ffee);
    for (let i = 0; i < STAR_COUNT; i++) {
      // Random point on a large sphere.
      const u = rng();
      const v = rng();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 600 + rng() * 400;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.cos(phi);
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={BOSS_COLORS.star} size={1.6} sizeAttenuation transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}

export default function BossArena() {
  const r = ARENA.radius;
  const h = ARENA.halfHeight;

  return (
    <group name="boss-arena">
      {/* Dramatic lighting — deep red against void black */}
      <ambientLight color={BOSS_COLORS.deepRed} intensity={0.25} />
      <hemisphereLight color={BOSS_COLORS.bloodRed} groundColor={BOSS_COLORS.voidBlack} intensity={0.3} />
      <directionalLight color={BOSS_COLORS.ember} intensity={0.8} position={[30, 70, 20]} castShadow />
      <pointLight color={BOSS_COLORS.bloodRed} intensity={3} distance={140} position={[0, 30, 0]} />

      <Starfield />

      {/* Distant corruption nebula shell for depth */}
      <mesh>
        <sphereGeometry args={[900, 24, 16]} />
        <meshBasicMaterial color={BOSS_COLORS.deepRed} transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>

      {/* The platform — solid cylinder collider */}
      <RigidBody type="fixed" colliders={false} position={[0, 0, 0]}>
        <CylinderCollider args={[h, r]} />
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[r, r * 0.96, h * 2, 64]} />
          <meshStandardMaterial color={BOSS_COLORS.platform} metalness={0.5} roughness={0.6} emissive={BOSS_COLORS.deepRed} emissiveIntensity={0.12} />
        </mesh>
      </RigidBody>

      {/* Glowing rim ring */}
      <mesh position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.94, r, 80]} />
        <meshBasicMaterial color={BOSS_COLORS.platformEdge} transparent opacity={0.9} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Concentric floor glyph for menace */}
      <mesh position={[0, h + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.34, r * 0.36, 64]} />
        <meshBasicMaterial color={BOSS_COLORS.bloodRed} transparent opacity={0.35} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* Underglow so the slab floats in red haze */}
      <pointLight color={BOSS_COLORS.deepRed} intensity={2.2} distance={90} position={[0, -10, 0]} />

      {/* Rising embers from the corrupted platform */}
      <AmbientMotes
        radius={r * 0.95}
        height={32}
        color={BOSS_COLORS.ember}
        count={240}
        size={0.4}
        opacity={0.55}
        rise={1.2}
        seed={0xdead}
      />
    </group>
  );
}
