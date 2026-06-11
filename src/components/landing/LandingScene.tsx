"use client";

/**
 * LandingScene — the full-viewport 3D Nexus background for the landing page.
 *
 * Reuses the same station + deep-space set dressing as the playable Nexus
 * (NexusStation, NexusBackground) so the landing hero matches the in-game
 * scale and visual identity exactly, with a scroll-driven cinematic camera
 * (ScrollCamera) standing in for the reference HTML's camPath.
 */
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import NexusStation from "@/components/nexus/NexusStation";
import NexusBackground from "@/components/nexus/NexusBackground";
import { NEXUS_COLORS, NEXUS_FOG } from "@/components/nexus/nexusConstants";
import ScrollCamera from "./ScrollCamera";

export default function LandingScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ fov: 68, near: 0.5, far: 4000, position: [0, 40, 240] }}
    >
      <color attach="background" args={[NEXUS_COLORS.black]} />
      <fog attach="fog" args={[NEXUS_COLORS.fog, NEXUS_FOG.near, NEXUS_FOG.far]} />
      <NexusStation />
      <NexusBackground />
      <ScrollCamera />
    </Canvas>
  );
}
