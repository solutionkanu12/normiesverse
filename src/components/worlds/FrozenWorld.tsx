"use client";

/**
 * FrozenWorld — an ice-crystal tundra under an aurora sky.
 *
 * Derived from the Normie:
 *   - Crystal formations are placed from the pixel bitmap; sparse Normies give
 *     a bare tundra, dense ones a crystal forest (pixel density → packing).
 *   - Crystal height/scale scales with each block's fill weight.
 *   - The aurora + ice tint come from the cold, Expression-shifted palette.
 *
 * Physics: a solid ice ground plane. Crystals are visual landmarks.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import type { WorldConfig } from "@/systems/world/worldTypes";
import AmbientMotes from "@/components/shared/AmbientMotes";
import { GroundCollider, HiddenCache } from "./WorldPrimitives";

const SNOW_COUNT = 1200;

function Snow({ extent, color }: { extent: number; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(SNOW_COUNT * 3);
    const rng = mulberry32(909);
    for (let i = 0; i < SNOW_COUNT; i++) {
      arr[i * 3] = (rng() - 0.5) * extent * 2.4;
      arr[i * 3 + 1] = rng() * 70;
      arr[i * 3 + 2] = (rng() - 0.5) * extent * 2.4;
    }
    return arr;
  }, [extent]);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < SNOW_COUNT; i++) {
      arr[i * 3 + 1] -= 0.18;
      arr[i * 3] += Math.sin(t + i) * 0.01; // drift
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 70;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.6} transparent opacity={0.85} sizeAttenuation />
    </points>
  );
}

/** Aurora — drifting emissive ribbons high in the deep-navy sky. */
function Aurora({ color, extent }: { color: string; extent: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const ribbons = useMemo(
    () => Array.from({ length: 4 }, (_, i) => ({ y: 70 + i * 14, z: -extent - i * 30, phase: i * 1.4 })),
    [extent],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + 0.1 * Math.sin(t * 0.6 + ribbons[i].phase);
      m.position.x = Math.sin(t * 0.2 + ribbons[i].phase) * 30;
    });
  });
  return (
    <group name="aurora">
      {ribbons.map((r, i) => (
        <mesh
          key={i}
          position={[0, r.y, r.z]}
          rotation={[0, 0, Math.PI / 2]}
          ref={(m) => {
            refs.current[i] = m;
          }}
        >
          <planeGeometry args={[120, extent * 2.5, 1, 1]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function FrozenWorld({ config }: { config: WorldConfig }) {
  const { palette, placements, extent, density } = config;

  // Crystal formations from the bitmap. Each block → a small cluster.
  const crystals = useMemo(() => {
    const rng = mulberry32(config.seed ^ 0x1ce1ce);
    const heightScale = 0.8 + density * 1.2;
    return placements.map((p) => {
      const h = 4 + p.weight * 22 * heightScale + rng() * 4;
      const r = 1 + p.weight * 2.5;
      const tilt = (rng() - 0.5) * 0.4;
      const shards = 2 + Math.floor(rng() * 3);
      return { p, h, r, tilt, shards, rot: rng() * Math.PI };
    });
  }, [placements, config.seed, density]);

  return (
    <group name="frozen-world">
      {/* Cold lighting */}
      <ambientLight color={palette.ambient} intensity={1.3} />
      <directionalLight color={palette.key} intensity={1.8} position={[40, 100, -60]} castShadow />
      <hemisphereLight args={[palette.particle, palette.secondary, 0.6]} />

      {/* Ice ground: visible plane + solid collider */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[extent * 3, extent * 3]} />
        <meshStandardMaterial color={palette.secondary} metalness={0.2} roughness={0.15} envMapIntensity={0.4} />
      </mesh>
      <GroundCollider extent={extent} />

      {/* Crystal formations */}
      {crystals.map((c, i) => (
        <group key={i} position={[c.p.x, 0, c.p.z]} rotation={[c.tilt, c.rot, c.tilt]}>
          {Array.from({ length: c.shards }).map((_, s) => {
            const off = (s - (c.shards - 1) / 2) * c.r * 0.9;
            const sh = c.h * (0.6 + (s % 2) * 0.4);
            return (
              <mesh key={s} position={[off, sh / 2, off * 0.4]} castShadow>
                <coneGeometry args={[c.r * 0.7, sh, 5]} />
                <meshStandardMaterial
                  color={palette.primary}
                  metalness={0.1}
                  roughness={0.05}
                  transparent
                  opacity={0.8}
                  emissive={palette.accent}
                  emissiveIntensity={0.15}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Sky + weather */}
      <Aurora color={palette.accent} extent={extent} />
      <Snow extent={extent} color={palette.particle} />

      {/* Drifting ice glints */}
      <AmbientMotes
        radius={extent * 0.9}
        height={28}
        color={palette.accent}
        count={200}
        size={0.3}
        opacity={0.6}
        rise={0.5}
        seed={config.seed ^ 0x1ce91}
      />

      {/* Hidden cache (Canvas Level unlock) */}
      {config.hiddenAreaUnlocked && <HiddenCache position={config.hiddenAreaPosition} color={palette.accent} />}
    </group>
  );
}
