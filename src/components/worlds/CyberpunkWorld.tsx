"use client";

/**
 * CyberpunkWorld — a dense, rain-soaked neon city.
 *
 * All of it derives from the Normie:
 *   - Buildings are placed from the pixel bitmap (EnvironmentSeeder); the
 *     denser the Normie, the more packed the skyline.
 *   - Building height scales with each block's fill weight + density.
 *   - The neon accent is the Expression-derived palette accent.
 *   - The Accessory-driven architecture theme tweaks building silhouettes.
 *
 * Physics: a single ground-plane collider (the streets). Buildings are visual
 * obstacles you weave between, not colliders — keeps the city walkable.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import type { WorldConfig } from "@/systems/world/worldTypes";
import AmbientMotes from "@/components/shared/AmbientMotes";
import { GroundCollider, HiddenCache } from "./WorldPrimitives";

const RAIN_COUNT = 1400;

function Rain({ extent, color }: { extent: number; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(RAIN_COUNT * 3);
    const rng = mulberry32(4242);
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3] = (rng() - 0.5) * extent * 2.4;
      arr[i * 3 + 1] = rng() * 90;
      arr[i * 3 + 2] = (rng() - 0.5) * extent * 2.4;
    }
    return arr;
  }, [extent]);

  useFrame(() => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < RAIN_COUNT; i++) {
      arr[i * 3 + 1] -= 1.6;
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 90;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.5} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

/** Architecture theme → a vertical scale + cap style hint. */
function themeShape(architecture: string): { taper: number; cap: boolean } {
  switch (architecture) {
    case "Crowned Spires":
      return { taper: 0.5, cap: true };
    case "Mirror Glass":
      return { taper: 1, cap: false };
    case "Stacked Capsules":
      return { taper: 0.85, cap: true };
    case "Pagoda Decks":
      return { taper: 0.7, cap: true };
    case "Smokestacks":
      return { taper: 0.35, cap: false };
    default:
      return { taper: 0.9, cap: false };
  }
}

export default function CyberpunkWorld({ config }: { config: WorldConfig }) {
  const { palette, placements, extent, density } = config;
  const { taper, cap } = themeShape(config.architecture);

  // Per-building derived geometry (height from fill weight + density).
  const buildings = useMemo(() => {
    const rng = mulberry32(config.seed ^ 0xc0ffee);
    const heightScale = 1 + density * 1.6;
    return placements.map((p) => {
      const base = 8 + p.weight * 46 * heightScale + rng() * 8;
      const w = 3.5 + rng() * 2.5;
      const neon = rng() > 0.45;
      return { p, h: base, w, topW: w * taper, neon };
    });
  }, [placements, config.seed, density, taper]);

  return (
    <group name="cyberpunk-world">
      {/* Lighting */}
      <ambientLight color={palette.ambient} intensity={1.1} />
      <directionalLight color={palette.key} intensity={1.4} position={[60, 120, 40]} castShadow />
      <hemisphereLight args={[palette.key, palette.primary, 0.4]} />

      {/* Wet street ground: visible plane (decoration) + solid collider */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[extent * 3, extent * 3]} />
        <meshStandardMaterial color={palette.primary} metalness={0.85} roughness={0.25} envMapIntensity={0.6} />
      </mesh>
      <GroundCollider extent={extent} />

      {/* Glowing street grid inlay */}
      <gridHelper args={[extent * 2.6, 40, palette.accent, palette.secondary]} position={[0, 0.05, 0]} />

      {/* Buildings (from the bitmap) */}
      {buildings.map((b, i) => (
        <group key={i} position={[b.p.x, 0, b.p.z]}>
          <mesh position={[0, b.h / 2, 0]} castShadow>
            <boxGeometry args={[b.w, b.h, b.w]} />
            <meshStandardMaterial
              color={palette.primary}
              metalness={0.7}
              roughness={0.35}
              emissive={b.neon ? palette.accent : palette.secondary}
              emissiveIntensity={b.neon ? 0.18 : 0.08}
            />
          </mesh>
          {/* Neon strip up the facade */}
          {b.neon && (
            <mesh position={[0, b.h / 2, b.w / 2 + 0.05]}>
              <boxGeometry args={[b.w * 0.18, b.h * 0.8, 0.1]} />
              <meshBasicMaterial color={palette.accent} />
            </mesh>
          )}
          {/* Roof cap / antenna for themed silhouettes */}
          {cap && (
            <mesh position={[0, b.h + 1.5, 0]}>
              <boxGeometry args={[b.topW, 3, b.topW]} />
              <meshStandardMaterial color={palette.secondary} metalness={0.8} roughness={0.3} emissive={palette.secondary} emissiveIntensity={0.2} />
            </mesh>
          )}
        </group>
      ))}

      {/* Rain */}
      <Rain extent={extent} color={palette.particle} />

      {/* Rising neon embers */}
      <AmbientMotes
        radius={extent * 0.9}
        height={36}
        color={palette.accent}
        count={220}
        size={0.4}
        opacity={0.55}
        rise={1.4}
        seed={config.seed ^ 0x3eed1}
      />

      {/* Hidden cache (Canvas Level unlock) */}
      {config.hiddenAreaUnlocked && <HiddenCache position={config.hiddenAreaPosition} color={palette.accent} />}
    </group>
  );
}
