"use client";

/**
 * RealityCore — the glowing orb the player recovers in each world. Reads the
 * player's (throttled) position from usePlayerStore each frame; when the
 * player walks within {@link CORE_COLLECT_RADIUS} it fires `onCollect` once,
 * then plays a brief absorb animation and fades out.
 *
 * The core color comes from the world palette (Expression-derived), so even
 * the objective is seeded from Normie data.
 */
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/store/usePlayerStore";
import { CORE_COLLECT_RADIUS } from "./worldConstants";
import type { Vec3 } from "@/systems/world/worldTypes";

interface RealityCoreProps {
  position: Vec3;
  color: string;
  /** Fired once when the player first reaches the core. */
  onCollect: () => void;
  /** Whether this core was already collected (skip rendering). */
  collected: boolean;
}

export default function RealityCore({ position, color, onCollect, collected }: RealityCoreProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const collectedAt = useRef<number | null>(null);
  const fired = useRef(false);
  const [done, setDone] = useState(false);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    g.rotation.y = t * 0.8;
    const bob = Math.sin(t * 1.6) * 0.4;
    g.position.set(position[0], position[1] + bob, position[2]);

    const pulse = 0.9 + Math.sin(t * 3) * 0.1;
    if (coreRef.current) coreRef.current.scale.setScalar(pulse);
    if (haloRef.current) haloRef.current.scale.setScalar(1.4 + Math.sin(t * 2) * 0.15);

    // Collection check (skip if already collected before mount).
    if (!collected && !fired.current) {
      const p = usePlayerStore.getState().position;
      const d = Math.hypot(p[0] - position[0], p[1] - position[1], p[2] - position[2]);
      if (d < CORE_COLLECT_RADIUS) {
        fired.current = true;
        collectedAt.current = t;
        onCollect();
      }
    }

    // Absorb animation → fade + scale up, then unmount.
    if (collectedAt.current != null) {
      const e = t - collectedAt.current;
      const k = Math.min(1, e / 0.8);
      g.scale.setScalar(1 + k * 2.5);
      const mat = coreRef.current?.material as THREE.MeshBasicMaterial | undefined;
      if (mat) mat.opacity = 1 - k;
      if (k >= 1 && !done) setDone(true);
    }
  });

  if (collected || done) return null;

  return (
    <group ref={groupRef} position={position} name="reality-core">
      {/* Inner crystal */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1.1, 0]} />
        <meshBasicMaterial color={color} transparent opacity={1} />
      </mesh>
      {/* Wireframe shell */}
      <mesh>
        <icosahedronGeometry args={[1.6, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
      </mesh>
      {/* Soft halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[2, 20, 20]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Beacon column so it's findable from afar */}
      <mesh position={[0, 30, 0]}>
        <cylinderGeometry args={[0.5, 2.2, 60, 6, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight color={color} intensity={4} distance={40} />
    </group>
  );
}
