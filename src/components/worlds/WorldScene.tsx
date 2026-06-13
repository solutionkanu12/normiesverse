"use client";

/**
 * WorldScene — the R3F Canvas for a generated universe. Sets up the physics
 * world (gravity per kind), drops in the kind-specific environment, the
 * carried-over player controller (rendering the Normie voxel avatar with its
 * Type-driven material), the Reality Core, trait-driven enemies, and the
 * post-processing stack.
 *
 * Everything visual/structural is driven by the {@link WorldConfig}, which the
 * WorldFactory derived from the selected Normie's API data.
 */
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import type { AvatarBuild } from "@/systems/normie/avatar.types";
import type { WorldConfig } from "@/systems/world/worldTypes";
import { useGameStore } from "@/store/useGameStore";
import PlayerController from "@/components/player/PlayerController";
import QuestTracker from "@/components/quests/QuestTracker";
import QuestMarker from "@/components/quests/QuestMarker";
import GroundFog from "@/components/shared/GroundFog";
import CyberpunkWorld from "./CyberpunkWorld";
import FrozenWorld from "./FrozenWorld";
import VoidWorld from "./VoidWorld";
import RealityCore from "./RealityCore";
import WorldEnemies from "./WorldEnemies";
import { DEFAULT_ENEMY_BASE_Y, ENEMY_BASE_Y, WORLD_GRAVITY } from "./worldConstants";

interface WorldSceneProps {
  config: WorldConfig;
  build: AvatarBuild;
  coreCollected: boolean;
  onCollectCore: () => void;
  onLockChange: (locked: boolean) => void;
}

function WorldEnvironment({ config }: { config: WorldConfig }) {
  switch (config.kind) {
    case "cyberpunk":
      return <CyberpunkWorld config={config} />;
    case "frozen":
      return <FrozenWorld config={config} />;
    case "void":
    default:
      return <VoidWorld config={config} />;
  }
}

export default function WorldScene({ config, build, coreCollected, onCollectCore, onLockChange }: WorldSceneProps) {
  const { palette } = config;
  const gravity = WORLD_GRAVITY[config.kind] ?? WORLD_GRAVITY.cyberpunk;
  const enemyBaseY = ENEMY_BASE_Y[config.kind] ?? DEFAULT_ENEMY_BASE_Y;
  const paused = useGameStore((s) => s.paused);

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      camera={{ fov: 70, near: 0.1, far: 4000, position: [0, 6, config.spawn[2] + 12] }}
    >
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.fog, palette.fogNear, palette.fogFar]} />

      <Suspense fallback={null}>
        <Physics gravity={gravity} timeStep={1 / 60}>
          <WorldEnvironment config={config} />

          <GroundFog radius={config.extent} color={palette.fog} seed={config.seed ^ 0xf0e1} />

          <PlayerController build={build} spawn={config.spawn} frozen={paused} onLockChange={onLockChange} />

          <RealityCore
            position={config.corePosition}
            color={config.coreColor}
            collected={coreCollected}
            onCollect={onCollectCore}
          />

          <WorldEnemies config={config.enemies} seed={config.seed} extent={config.extent} baseY={enemyBaseY} />

          <QuestTracker worldKind={config.kind} />
          <QuestMarker worldKind={config.kind} accent={config.coreColor} />
        </Physics>

        <EffectComposer>
          <Bloom intensity={1.1} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur radius={0.75} />
          <ChromaticAberration offset={new THREE.Vector2(0.0008, 0.0008)} radialModulation={false} modulationOffset={0} />
          <Vignette eskil={false} offset={0.25} darkness={0.9} />
          <Noise opacity={0.045} blendFunction={BlendFunction.OVERLAY} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
