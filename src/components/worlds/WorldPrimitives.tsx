"use client";

/**
 * Shared world primitives: the solid ground collider used by the flat worlds
 * and the glowing "hidden cache" marker revealed by a high Canvas Level.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";

/**
 * Invisible solid ground collider (a thick cuboid just under y=0, top
 * surface at y=0). Uses an explicit CuboidCollider — auto colliders
 * (`colliders="cuboid"`) only consider *visible* meshes, so an invisible
 * mesh would silently produce no collider at all and the player falls
 * through the floor.
 */
export function GroundCollider({ extent }: { extent: number }) {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, -0.5, 0]}>
      <CuboidCollider args={[extent * 1.5, 0.5, extent * 1.5]} />
    </RigidBody>
  );
}

/** A rotating wireframe marker for the Canvas-Level-gated hidden area. */
export function HiddenCache({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.6;
  });
  return (
    <group position={position} name="hidden-cache">
      <mesh ref={ref}>
        <torusKnotGeometry args={[2, 0.5, 80, 12]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>
      <pointLight color={color} intensity={3} distance={30} />
    </group>
  );
}
