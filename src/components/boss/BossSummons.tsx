"use client";

/**
 * BossSummons — phase-2 hazard. The Null Normie tears enemies out of all three
 * recovered realities (CLAUDE.md: "Summons enemies from all 3 worlds"). Each
 * summon wears the silhouette + accent of one of the three Nexus portals
 * (cyberpunk / frozen / void), cycled across the swarm, and drifts toward the
 * player as a moving threat.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/store/usePlayerStore";
import { cssColor, mulberry32, PORTALS } from "@/components/nexus/nexusConstants";
import type { WorldKind } from "@/store/useWorldStore";
import { ARENA } from "./bossConstants";

interface BossSummonsProps {
  seed: number;
  count: number;
}

interface SummonData {
  home: THREE.Vector3;
  phase: number;
  patrolR: number;
  speed: number;
  kind: WorldKind;
  color: string;
}

/** Each world kind's signature silhouette (mirrors WorldEnemies shapes). */
function SummonMesh({ kind, color }: { kind: WorldKind; color: string }) {
  switch (kind) {
    case "frozen":
      return (
        <mesh castShadow>
          <capsuleGeometry args={[0.45, 1, 4, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.8} />
        </mesh>
      );
    case "void":
      return (
        <mesh>
          <icosahedronGeometry args={[0.8, 0]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.85} />
        </mesh>
      );
    case "cyberpunk":
    default:
      return (
        <mesh castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} emissive={color} emissiveIntensity={0.35} />
        </mesh>
      );
  }
}

const _player = new THREE.Vector3();
const _target = new THREE.Vector3();

function Summon({ data }: { data: SummonData }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Drift toward the player (slow, menacing) with a little patrol wobble.
    const p = usePlayerStore.getState().position;
    _player.set(p[0], p[1] + 1.5, p[2]);
    _target.set(
      _player.x + Math.cos(t * 0.6 + data.phase) * data.patrolR,
      _player.y + Math.sin(t + data.phase) * 0.8 + 1,
      _player.z + Math.sin(t * 0.6 + data.phase) * data.patrolR,
    );
    g.position.lerp(_target, Math.min(1, data.speed * dt * 0.25));
    g.rotation.y += dt * 1.2;
  });

  return (
    <group ref={ref} position={data.home.toArray()}>
      <SummonMesh kind={data.kind} color={data.color} />
      <pointLight color={data.color} intensity={0.7} distance={7} />
    </group>
  );
}

export default function BossSummons({ seed, count }: BossSummonsProps) {
  const summons = useMemo<SummonData[]>(() => {
    const rng = mulberry32(seed ^ 0x1a2b3c);
    return Array.from({ length: count }, (_, i) => {
      const a = rng() * Math.PI * 2;
      const r = ARENA.radius * (0.4 + rng() * 0.5);
      const portal = PORTALS[i % PORTALS.length];
      return {
        home: new THREE.Vector3(Math.cos(a) * r, 3 + rng() * 4, Math.sin(a) * r),
        phase: rng() * Math.PI * 2,
        patrolR: 2 + rng() * 3,
        speed: 1.4 + rng() * 1.2,
        kind: portal.id,
        color: cssColor(portal.color),
      };
    });
  }, [seed, count]);

  return (
    <group name="boss-summons">
      {summons.map((s, i) => (
        <Summon key={i} data={s} />
      ))}
    </group>
  );
}
