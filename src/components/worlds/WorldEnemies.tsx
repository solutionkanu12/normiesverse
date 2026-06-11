"use client";

/**
 * WorldEnemies — simple, trait-driven hostile entities.
 *
 * Count, speed, aggro range and aggression all come from the WorldConfig
 * (derived from Type / Expression / pixel density / Canvas Level). Each enemy
 * patrols a home point; aggressive ones drift toward the player when within
 * aggro range (reading the player's throttled position from the store). This
 * is deliberately pre-combat — Phase 10 introduces real fighting.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/store/usePlayerStore";
import { seedEnemies } from "@/systems/world/EnvironmentSeeder";
import type { EnemyConfig } from "@/systems/world/worldTypes";

interface WorldEnemiesProps {
  config: EnemyConfig;
  seed: number;
  /** World radius enemies spawn/patrol within. */
  extent: number;
  /** Base Y the enemies hover around. */
  baseY?: number;
}

interface EnemyData {
  home: THREE.Vector3;
  phase: number;
  patrolR: number;
  speedJitter: number;
}

const _target = new THREE.Vector3();
const _player = new THREE.Vector3();

function EnemyMesh({ shape, color }: { shape: EnemyConfig["shape"]; color: string }) {
  switch (shape) {
    case "feline":
      return (
        <mesh castShadow>
          <capsuleGeometry args={[0.5, 1.1, 4, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.9} />
        </mesh>
      );
    case "wisp":
      return (
        <mesh>
          <icosahedronGeometry args={[0.9, 0]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.85} />
        </mesh>
      );
    case "sentinel":
      return (
        <mesh castShadow>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={color} metalness={0.95} roughness={0.15} emissive={color} emissiveIntensity={0.3} />
        </mesh>
      );
    case "drone":
    default:
      return (
        <mesh castShadow>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} emissive={color} emissiveIntensity={0.35} />
        </mesh>
      );
  }
}

function Enemy({ data, config }: { data: EnemyData; config: EnemyConfig }) {
  const ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Default patrol target: a slow circle around home.
    _target.set(
      data.home.x + Math.cos(t * 0.5 + data.phase) * data.patrolR,
      data.home.y + Math.sin(t * 1.3 + data.phase) * 0.8,
      data.home.z + Math.sin(t * 0.5 + data.phase) * data.patrolR,
    );

    // Aggressive enemies chase when the player is within range.
    if (config.aggressive) {
      const p = usePlayerStore.getState().position;
      _player.set(p[0], p[1] + 1, p[2]);
      if (_player.distanceTo(g.position) < config.aggroRange) {
        _target.copy(_player);
      }
    }

    const speed = config.speed * data.speedJitter;
    g.position.lerp(_target, Math.min(1, speed * dt * 0.4));
    g.rotation.y += dt * 1.4;
    g.lookAt(_target);
  });

  return (
    <group ref={ref} position={data.home.toArray()}>
      <EnemyMesh shape={config.shape} color={config.color} />
      <pointLight color={config.color} intensity={0.8} distance={8} />
    </group>
  );
}

export default function WorldEnemies({ config, seed, extent, baseY = 2.5 }: WorldEnemiesProps) {
  const enemies = useMemo<EnemyData[]>(
    () =>
      seedEnemies(seed, config.count, extent, baseY).map((e) => ({
        home: new THREE.Vector3(...e.home),
        phase: e.phase,
        patrolR: e.patrolR,
        speedJitter: e.speedJitter,
      })),
    [config.count, seed, extent, baseY],
  );

  return (
    <group name="world-enemies">
      {enemies.map((e, i) => (
        <Enemy key={i} data={e} config={config} />
      ))}
    </group>
  );
}
