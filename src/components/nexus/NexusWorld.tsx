"use client";

/**
 * NexusWorld — the main playable 3D scene.
 *
 * Assembles the R3F Canvas: the colossal station, the deep-space background,
 * the walkable plaza (physics), the player controller, the NPC guide, the
 * portal gateways, and the post-processing stack (bloom, chromatic
 * aberration, vignette). The HUD is a DOM sibling so clicks fall through to
 * the canvas for pointer lock.
 *
 * Stepping through a portal (E while in range) freezes the player, distorts
 * the canvas (motion.div scale/blur "warp"), and shows the PortalTransition
 * overlay; on completion the destination is saved to useWorldStore and the
 * router navigates to /game/world/[id].
 */
import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { motion } from "framer-motion";
import * as THREE from "three";
import type { AvatarBuild } from "@/systems/normie/avatar.types";
import { useGameStore } from "@/store/useGameStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useWorldStore, type WorldKind } from "@/store/useWorldStore";
import { isPortalUnlocked, previousPortal } from "@/systems/quest/portalGate";
import { CORE_ID } from "@/systems/world/WorldFactory";
import NexusStation from "./NexusStation";
import NexusBackground from "./NexusBackground";
import NexusPlaza from "./NexusPlaza";
import NpcGuide from "./NpcGuide";
import NexusHud from "./NexusHud";
import Portals from "./Portals";
import PortalTransition from "./PortalTransition";
import PlayerController from "@/components/player/PlayerController";
import GroundFog from "@/components/shared/GroundFog";
import {
  GUIDE_POS,
  GUIDE_TRIGGER_RADIUS,
  NEXUS_COLORS,
  NEXUS_FOG,
  PLAZA,
  PORTAL,
  PORTALS,
  SPAWN,
  type PortalDef,
} from "./nexusConstants";

interface NexusWorldProps {
  build: AvatarBuild;
  level: number;
}

export default function NexusWorld({ build, level }: NexusWorldProps) {
  const router = useRouter();
  const setWorld = useWorldStore((s) => s.setWorld);
  const realityCores = usePlayerStore((s) => s.realityCores);
  const paused = useGameStore((s) => s.paused);

  const [locked, setLocked] = useState(false);
  const [nearGuide, setNearGuide] = useState(false);
  const [nearPortalId, setNearPortalId] = useState<WorldKind | null>(null);
  const [transitionPortal, setTransitionPortal] = useState<PortalDef | null>(null);

  const caOffset = useMemo(() => new THREE.Vector2(0.0009, 0.0009), []);

  const handleEnterPortal = useCallback(
    (portalId: WorldKind) => {
      if (!isPortalUnlocked(portalId, realityCores)) return;
      setTransitionPortal((current) => current ?? PORTALS.find((p) => p.id === portalId) ?? null);
    },
    [realityCores],
  );

  const handleTransitionComplete = useCallback(() => {
    if (!transitionPortal) return;
    setWorld(transitionPortal.id);
    router.push(`/game/world/${transitionPortal.id}`);
  }, [transitionPortal, setWorld, router]);

  const nearPortalDef = !transitionPortal && nearPortalId ? PORTALS.find((p) => p.id === nearPortalId) ?? null : null;
  const nearPortalLocked = nearPortalDef ? !isPortalUnlocked(nearPortalDef.id, realityCores) : false;
  const requiredWorldLabel =
    nearPortalDef && nearPortalLocked
      ? PORTALS.find((p) => p.id === previousPortal(nearPortalDef.id))?.label ?? null
      : null;

  // The Null Rift opens once all three Reality Cores are recovered.
  const allCoresCollected = Object.values(CORE_ID).every((id) => realityCores.includes(id));

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Canvas wrapper — animated for the portal "warp" distortion */}
      <motion.div
        className="absolute inset-0"
        animate={
          transitionPortal
            ? { scale: 1.18, filter: "blur(14px) saturate(1.8) brightness(1.4)" }
            : { scale: 1, filter: "blur(0px) saturate(1) brightness(1)" }
        }
        transition={{ duration: 0.7, ease: "easeIn" }}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          camera={{ fov: 68, near: 0.1, far: 6000, position: [0, 4, 100] }}
        >
          <color attach="background" args={[NEXUS_COLORS.black]} />
          <fog attach="fog" args={[NEXUS_COLORS.fog, NEXUS_FOG.near, NEXUS_FOG.far]} />

          <Suspense fallback={null}>
            {/* Physics world: only the plaza + player have colliders */}
            <Physics gravity={[0, -26, 0]}>
              <NexusPlaza />
              <PlayerController
                build={build}
                spawn={SPAWN}
                guidePos={GUIDE_POS}
                guideTriggerRadius={GUIDE_TRIGGER_RADIUS}
                portals={PORTALS}
                portalTriggerRadius={PORTAL.triggerRadius}
                frozen={paused || !!transitionPortal}
                onLockChange={setLocked}
                onNearGuideChange={setNearGuide}
                onNearPortalChange={setNearPortalId}
                onEnterPortal={handleEnterPortal}
              />
              <NpcGuide position={GUIDE_POS} active={nearGuide} />
            </Physics>

            {/* Non-physics set dressing */}
            <NexusStation />
            <NexusBackground />
            <Portals nearPortalId={nearPortalId} />
            <GroundFog radius={PLAZA.radius} color={NEXUS_COLORS.hullMid} seed={0xfade} />

            {/* Post-processing */}
            <EffectComposer>
              <Bloom intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur radius={0.7} />
              <ChromaticAberration offset={caOffset} radialModulation={false} modulationOffset={0} />
              <Vignette eskil={false} offset={0.22} darkness={0.85} />
              <Noise opacity={0.045} blendFunction={BlendFunction.OVERLAY} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </motion.div>

      <NexusHud
        locked={locked}
        nearGuide={nearGuide}
        normieId={build.normieId}
        level={level}
        nearPortal={nearPortalDef}
        portalLocked={nearPortalLocked}
        requiredWorldLabel={requiredWorldLabel}
        allCoresCollected={allCoresCollected}
      />

      <PortalTransition portal={transitionPortal} onComplete={handleTransitionComplete} />
    </div>
  );
}
