"use client";

/**
 * BossScene — the R3F Canvas for the Null Normie fight. Wires the arena
 * (physics), the player controller, the boss entity, the phase-gated hazards
 * (fragments → summons → void zones), the combat director, and a phase-driven
 * post-processing stack whose reality distortion intensifies as the boss
 * weakens (chromatic aberration maxes out from phase 2).
 *
 * The shared {@link BossRef} is the hand-off: NullNormie writes its live
 * position into it; BossDirector + hazards read from it.
 */
import { Suspense, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import type { AvatarBuild } from "@/systems/normie/avatar.types";
import { useGameStore } from "@/store/useGameStore";
import PlayerController from "@/components/player/PlayerController";
import GroundFog from "@/components/shared/GroundFog";
import type { BossStats, BossPhase } from "@/systems/combat/BossStatCalculator";
import BossArena from "./BossArena";
import NullNormie from "./NullNormie";
import PixelFragments from "./PixelFragments";
import BossSummons from "./BossSummons";
import VoidZones from "./VoidZones";
import BossDirector from "./BossDirector";
import { ARENA, BOSS_COLORS, createBossRefData, generateVoidZones } from "./bossConstants";

interface BossSceneProps {
  build: AvatarBuild;
  stats: BossStats;
  /** Player's pixel-hash seed (deterministic arena layout). */
  seed: number;
  onLockChange: (locked: boolean) => void;
  /** Fired when the boss finishes dissolving (→ victory). */
  onDissolved: () => void;
}

/** Post-processing intensity by phase — distortion escalates as HP drops. */
const BLOOM_BY_PHASE: Record<BossPhase, number> = { 1: 0.9, 2: 1.5, 3: 1.9 };
const CA_BY_PHASE: Record<BossPhase, number> = { 1: 0.0012, 2: 0.006, 3: 0.0085 };
const VIGNETTE_BY_PHASE: Record<BossPhase, number> = { 1: 0.85, 2: 1.0, 3: 1.15 };
const NOISE_BY_PHASE: Record<BossPhase, number> = { 1: 0.05, 2: 0.09, 3: 0.14 };

export default function BossScene({ build, stats, seed, onLockChange, onDissolved }: BossSceneProps) {
  const phase = useGameStore((s) => s.boss.phase);
  const defeated = useGameStore((s) => s.boss.defeated);
  const paused = useGameStore((s) => s.paused);

  const bossRef = useRef(createBossRefData());
  const zones = useMemo(() => generateVoidZones(seed, ARENA.radius, stats.voidZoneCount), [seed, stats.voidZoneCount]);
  const caOffset = useMemo(() => new THREE.Vector2(CA_BY_PHASE[phase], CA_BY_PHASE[phase]), [phase]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 70, near: 0.1, far: 4000, position: [0, 6, ARENA.spawn[2] + 12] }}
    >
      <color attach="background" args={[BOSS_COLORS.voidBlack]} />
      <fog attach="fog" args={[BOSS_COLORS.fog, 60, 320]} />

      <Suspense fallback={null}>
        <Physics gravity={[0, -22, 0]}>
          <BossArena />
          <PlayerController build={build} spawn={ARENA.spawn} frozen={paused} onLockChange={onLockChange} />
        </Physics>

        <GroundFog radius={ARENA.radius} color={BOSS_COLORS.fog} seed={0xb055} />

        {/* Boss + phase-gated hazards (non-physics) */}
        <NullNormie bossRef={bossRef} build={build} stats={stats} onDissolved={onDissolved} />
        {!defeated && phase === 1 && <PixelFragments bossRef={bossRef} pixels={build.pixels} count={stats.fragmentCount} />}
        {!defeated && phase >= 2 && <BossSummons seed={seed} count={stats.summonCount} />}
        {!defeated && phase === 3 && <VoidZones zones={zones} />}

        <BossDirector bossRef={bossRef} zones={zones} stats={stats} />

        <EffectComposer>
          <Bloom intensity={BLOOM_BY_PHASE[phase]} luminanceThreshold={0.18} luminanceSmoothing={0.9} mipmapBlur radius={0.8} />
          <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />
          <Vignette eskil={false} offset={0.2} darkness={VIGNETTE_BY_PHASE[phase]} />
          <Noise opacity={NOISE_BY_PHASE[phase]} blendFunction={BlendFunction.OVERLAY} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
