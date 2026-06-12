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
        {/* main hull dome */}
        <mesh castShadow scale={[1, 0.92, 1]}>
          <sphereGeometry args={[0.85, 24, 16]} />
          <meshStandardMaterial {...HULL.panel} />
        </mesh>

        {/* sensor visor housing the eye */}
        <mesh position={[0, 0.05, 0.6]}>
          <boxGeometry args={[1.1, 0.32, 0.5]} />
          <meshStandardMaterial {...HULL.dark} />
        </mesh>
        <mesh position={[0, 0.1, 0.85]}>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshBasicMaterial color={active ? NEXUS_COLORS.cyan2 : NEXUS_COLORS.cyan} />
        </mesh>
        <pointLight ref={eyeLight} position={[0, 0.1, 1]} color={NEXUS_COLORS.cyan} intensity={1.4} distance={20} />

        {/* comms antenna */}
        <mesh position={[0, 0.95, -0.1]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
          <meshStandardMaterial {...HULL.mid} />
        </mesh>
        <mesh position={[0, 1.22, -0.1]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color={NEXUS_COLORS.gold} />
        </mesh>

        {/* stabilizer fins */}
        <mesh position={[0.78, -0.05, 0]} rotation={[0, 0, -0.25]} castShadow>
          <boxGeometry args={[0.45, 0.18, 0.6]} />
          <meshStandardMaterial {...HULL.mid} />
        </mesh>
        <mesh position={[-0.78, -0.05, 0]} rotation={[0, 0, 0.25]} castShadow>
          <boxGeometry args={[0.45, 0.18, 0.6]} />
          <meshStandardMaterial {...HULL.mid} />
        </mesh>

        {/* thruster nozzle (keeps it hovering) */}
        <mesh position={[0, -0.75, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.4, 0.5, 12]} />
          <meshStandardMaterial {...HULL.dark} emissive={NEXUS_COLORS.cyan} emissiveIntensity={0.3} />
        </mesh>

        {/* orbiting halo ring */}
        <mesh ref={ringRef} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[1.5, 0.04, 8, 48]} />
          <meshBasicMaterial color={NEXUS_COLORS.cyan} transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
}
