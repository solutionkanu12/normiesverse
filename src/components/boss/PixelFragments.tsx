"use client";

/**
 * PixelFragments — phase-1 hazard. The Null Normie tears fragments out of the
 * player's own bitmap (CLAUDE.md: "Summons fragments built from the player's
 * own pixel data") and flings them into orbit around itself. Purely a
 * spectacle/pressure element — they swarm the boss and pulse with corruption.
 *
 * Each fragment's seed is drawn from the player's lit-pixel count, so a denser
 * Normie spawns a busier swarm.
 */
import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { parsePixels } from "@/systems/normie/PixelAnalyzer";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import { BOSS_COLORS, type BossRefData } from "./bossConstants";

interface PixelFragmentsProps {
  bossRef: RefObject<BossRefData>;
  /** The player's bitmap — the fragments are made of it. */
  pixels: string;
  count: number;
}

interface FragData {
  radius: number;
  height: number;
  phase: number;
  speed: number;
  size: number;
  tilt: number;
}

const SHADES = [BOSS_COLORS.bloodRed, BOSS_COLORS.corruption, BOSS_COLORS.ember];

function Fragment({ bossRef, data, color }: { bossRef: RefObject<BossRefData>; data: FragData; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const pos = bossRef.current.pos;
    const a = t * data.speed + data.phase;
    m.position.set(
      pos.x + Math.cos(a) * data.radius,
      pos.y + data.height + Math.sin(t * 1.5 + data.phase) * 0.6,
      pos.z + Math.sin(a) * data.radius,
    );
    m.rotation.x = t * 1.3 + data.tilt;
    m.rotation.y = t * 1.7 + data.tilt;
  });

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[data.size, data.size, data.size]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} metalness={0.3} roughness={0.5} />
    </mesh>
  );
}

export default function PixelFragments({ bossRef, pixels, count }: PixelFragmentsProps) {
  const frags = useMemo<FragData[]>(() => {
    const grid = parsePixels(pixels);
    const rng = mulberry32((grid.onCount + 1) * 40503);
    return Array.from({ length: count }, () => ({
      radius: 3.2 + rng() * 3.4,
      height: (rng() - 0.5) * 5,
      phase: rng() * Math.PI * 2,
      speed: 0.6 + rng() * 1.1,
      size: 0.3 + rng() * 0.35,
      tilt: rng() * Math.PI,
    }));
  }, [pixels, count]);

  return (
    <group name="pixel-fragments">
      {frags.map((f, i) => (
        <Fragment key={i} bossRef={bossRef} data={f} color={SHADES[i % SHADES.length]} />
      ))}
    </group>
  );
}
