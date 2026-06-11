"use client";

/**
 * NpcGuide — the Nexus sentinel that greets the player near spawn. A hovering
 * droid built from primitives with a glowing eye and a halo ring. Proximity
 * detection (and the dialogue itself) is handled by the PlayerController /
 * NexusWorld; this is the visible character + idle animation.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HULL, NEXUS_COLORS } from "./nexusConstants";

interface NpcGuideProps {
  position: [number, number, number];
  /** True while the player is within trigger range (eye glows brighter). */
  active?: boolean;
}

export default function NpcGuide({ position, active = false }: NpcGuideProps) {
  const bodyRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const eyeLight = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (bodyRef.current) {
      bodyRef.current.position.y = 2.2 + Math.sin(t * 1.5) * 0.18; // hover bob
      bodyRef.current.rotation.y = Math.sin(t * 0.4) * 0.3; // gentle scan
    }
    if (ringRef.current) ringRef.current.rotation.z = t * 0.8;
    if (eyeLight.current) eyeLight.current.intensity = (active ? 3 : 1.4) + Math.sin(t * 4) * 0.4;
  });

  return (
    <group position={position} name="npc-guide">
      {/* base pad */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.4, 1.8, 0.3, 16]} />
        <meshStandardMaterial {...HULL.panel} />
      </mesh>
      <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.08, 8, 32]} />
        <meshBasicMaterial color={NEXUS_COLORS.cyan} />
      </mesh>

      {/* hovering droid body */}
      <group ref={bodyRef}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.9, 0]} />
          <meshStandardMaterial color={0x16203c} metalness={0.85} roughness={0.3} emissive={0x0a1428} />
        </mesh>
        {/* eye */}
        <mesh position={[0, 0.1, 0.85]}>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshBasicMaterial color={active ? NEXUS_COLORS.cyan2 : NEXUS_COLORS.cyan} />
        </mesh>
        <pointLight ref={eyeLight} position={[0, 0.1, 1]} color={NEXUS_COLORS.cyan} intensity={1.4} distance={20} />

        {/* orbiting halo ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[1.5, 0.04, 8, 48]} />
          <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
}
