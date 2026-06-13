"use client";

/**
 * NullNormie — the boss entity. Owns its world position (writing it into the
 * shared {@link BossRef} for the combat director + HUD), flees the player's
 * purge between teleports, and teleports on a phase-driven cadence (8s → 6s →
 * 3s). It does not track its own HP — that lives in useGameStore; it only
 * reads the derived `phase` and `defeated` flags to drive behavior + dissolve.
 */
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useGameStore } from "@/store/useGameStore";
import type { AvatarBuild } from "@/systems/normie/avatar.types";
import { TELEPORT_INTERVAL, type BossStats } from "@/systems/combat/BossStatCalculator";
import NullNormieMesh from "./NullNormieMesh";
import { ARENA, BOSS_COLORS, BOSS_HEIGHT, COMBAT, type BossRefData } from "./bossConstants";

interface NullNormieProps {
  bossRef: RefObject<BossRefData>;
  build: AvatarBuild;
  stats: BossStats;
  /** Fired once the dissolve animation completes (→ victory). */
  onDissolved: () => void;
}

const _player = new THREE.Vector3();
const _flee = new THREE.Vector3();

export default function NullNormie({ bossRef, build, stats, onDissolved }: NullNormieProps) {
  const group = useRef<THREE.Group>(null);
  const phase = useGameStore((s) => s.boss.phase);
  const defeated = useGameStore((s) => s.boss.defeated);

  // Teleport bookkeeping (mutated outside React).
  const teleAccum = useRef(0);
  const invulnUntil = useRef(0);
  const emergeAt = useRef(0);

  // Place the boss for the start of the fight.
  const start = useMemo(() => new THREE.Vector3(0, BOSS_HEIGHT, -ARENA.radius * 0.4), []);
  useEffect(() => {
    const b = bossRef.current;
    b.pos.copy(start);
    if (group.current) group.current.position.copy(start);
  }, [bossRef, start]);

  const teleport = (now: number) => {
    const b = bossRef.current;
    const a = Math.random() * Math.PI * 2;
    const dist = ARENA.radius * (0.3 + Math.random() * 0.45);
    let x = Math.cos(a) * dist;
    let z = Math.sin(a) * dist;
    // Bias away from the player so the teleport actually breaks the purge.
    const p = usePlayerStore.getState().position;
    if (Math.hypot(x - p[0], z - p[2]) < COMBAT.strikeRange * 1.5) {
      x = -x;
      z = -z;
    }
    b.pos.set(x, BOSS_HEIGHT, z);
    invulnUntil.current = now + COMBAT.teleportInvuln;
    emergeAt.current = now;
    teleAccum.current = 0;
  };

  useFrame((state, delta) => {
    const g = group.current;
    const b = bossRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    if (defeated) {
      // Freeze in place and let the mesh dissolve.
      b.invuln = true;
      g.position.copy(b.pos);
      g.rotation.y += dt * 0.4;
      return;
    }

    // Teleport on the phase cadence.
    teleAccum.current += dt;
    if (teleAccum.current >= TELEPORT_INTERVAL[phase]) teleport(t);

    // Flee the player between teleports (boss speed is inverse of player speed).
    const p = usePlayerStore.getState().position;
    _player.set(p[0], BOSS_HEIGHT, p[2]);
    _flee.copy(b.pos).sub(_player);
    _flee.y = 0;
    const d = _flee.length();
    if (d > 0.001) {
      _flee.normalize();
      // Orbit component so it circles the arena instead of hugging the rim.
      // Compute the perpendicular from the ORIGINAL normalized x/z (saving them
      // first) so the second axis isn't derived from the already-mutated x.
      const ox = _flee.x;
      const oz = _flee.z;
      _flee.x = ox - oz * 0.5;
      _flee.z = oz + ox * 0.5;
      _flee.normalize();
      b.pos.addScaledVector(_flee, stats.speed * dt);
    }
    // Keep inside the platform.
    const rim = ARENA.radius * 0.82;
    const planar = Math.hypot(b.pos.x, b.pos.z);
    if (planar > rim) {
      b.pos.x *= rim / planar;
      b.pos.z *= rim / planar;
    }
    // Menacing bob.
    b.pos.y = BOSS_HEIGHT + Math.sin(t * 1.4) * 0.5;
    b.invuln = t < invulnUntil.current;

    g.position.copy(b.pos);
    g.rotation.y += dt * (0.6 + phase * 0.25);

    // Emerge pop after a teleport.
    const since = t - emergeAt.current;
    const emerge = emergeAt.current === 0 ? 1 : Math.min(1, since / 0.3);
    g.scale.setScalar(0.2 + emerge * 0.8);
  });

  return (
    <group ref={group} position={start.toArray()} name="null-normie">
      <NullNormieMesh pixels={build.pixels} phase={phase} dissolving={defeated} onDissolved={onDissolved} />
      {/* Corruption halo + light so the boss reads against the void. */}
      <pointLight color={BOSS_COLORS.bloodRed} intensity={defeated ? 8 : 4} distance={40} />
      <mesh>
        <sphereGeometry args={[4.4, 20, 20]} />
        <meshBasicMaterial
          color={BOSS_COLORS.deepRed}
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
