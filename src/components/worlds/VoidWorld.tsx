"use client";

/**
 * VoidWorld — no ground. Floating platforms in pure darkness, laid out
 * directly from the Normie's pixel bitmap, with matrix-green data streams and
 * a wireframe aesthetic.
 *
 * Derived from the Normie:
 *   - Each platform's XZ position comes from an "on" block of the bitmap, so
 *     the archipelago is literally the Normie's silhouette (seen from above).
 *   - Platform float heights are seeded deterministically (jump-reachable).
 *   - A guaranteed central spawn platform anchors the player at the origin.
 *
 * Physics: every platform is a solid cuboid collider. Gaps = the void; falling
 * respawns the player (handled in PlayerController).
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import type { WorldConfig } from "@/systems/world/worldTypes";
import AmbientMotes from "@/components/shared/AmbientMotes";
import { HiddenCache } from "./WorldPrimitives";
import { VOID_PLATFORM } from "./worldConstants";

const STREAM_COUNT = 1800;

// All platforms share one box + edges geometry (identical dimensions).
const PLATFORM_BOX = new THREE.BoxGeometry(
  VOID_PLATFORM.halfX * 2,
  VOID_PLATFORM.halfY * 2,
  VOID_PLATFORM.halfZ * 2,
);
const PLATFORM_EDGES = new THREE.EdgesGeometry(PLATFORM_BOX);

/** Matrix-style vertical data streams falling through the void. */
function DataStreams({ extent, color }: { extent: number; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(STREAM_COUNT * 3);
    const rng = mulberry32(20202);
    for (let i = 0; i < STREAM_COUNT; i++) {
      arr[i * 3] = (rng() - 0.5) * extent * 2.6;
      arr[i * 3 + 1] = (rng() - 0.5) * 120;
      arr[i * 3 + 2] = (rng() - 0.5) * extent * 2.6;
    }
    return arr;
  }, [extent]);

  useFrame(() => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < STREAM_COUNT; i++) {
      arr[i * 3 + 1] -= 0.9;
      if (arr[i * 3 + 1] < -60) arr[i * 3 + 1] = 60;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.5} transparent opacity={0.8} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

/** One floating platform: solid collider + wireframe-edged slab. */
function Platform({
  position,
  color,
  edge,
}: {
  position: [number, number, number];
  color: string;
  edge: string;
}) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh receiveShadow geometry={PLATFORM_BOX}>
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} emissive={edge} emissiveIntensity={0.12} />
      </mesh>
      <lineSegments geometry={PLATFORM_EDGES}>
        <lineBasicMaterial color={edge} transparent opacity={0.9} />
      </lineSegments>
    </RigidBody>
  );
}

export default function VoidWorld({ config }: { config: WorldConfig }) {
  const { palette, placements, extent } = config;

  return (
    <group name="void-world">
      {/* Eerie minimal lighting — the streams + platforms self-illuminate */}
      <ambientLight color={palette.ambient} intensity={0.6} />
      <directionalLight color={palette.key} intensity={0.7} position={[20, 60, 20]} />
      <pointLight color={palette.accent} intensity={2} distance={60} position={[0, 20, 0]} />

      {/* Guaranteed central spawn platform */}
      <Platform position={[0, 0, 0]} color={palette.primary} edge={palette.accent} />

      {/* Bitmap-seeded floating platforms */}
      {placements.map((p, i) => (
        <Platform key={i} position={[p.x, p.y, p.z]} color={palette.primary} edge={palette.accent} />
      ))}

      {/* Data streams */}
      <DataStreams extent={extent} color={palette.particle} />

      {/* Drifting glitch sparks */}
      <AmbientMotes
        radius={extent * 0.85}
        height={50}
        color={palette.accent}
        count={260}
        size={0.35}
        opacity={0.5}
        rise={0.9}
        seed={config.seed ^ 0x20202}
      />

      {/* Distant wireframe grid sphere for depth */}
      <mesh>
        <sphereGeometry args={[extent * 2.2, 16, 12]} />
        <meshBasicMaterial color={palette.secondary} wireframe transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>

      {/* Hidden cache (Canvas Level unlock) — its own platform */}
      {config.hiddenAreaUnlocked && (
        <>
          <Platform position={config.hiddenAreaPosition} color={palette.primary} edge={palette.accent} />
          <HiddenCache
            position={[config.hiddenAreaPosition[0], config.hiddenAreaPosition[1] + 3, config.hiddenAreaPosition[2]]}
            color={palette.accent}
          />
        </>
      )}
    </group>
  );
}
