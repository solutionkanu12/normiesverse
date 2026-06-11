"use client";

/**
 * GroundFog — layered, slowly drifting low-altitude mist discs tinted with a
 * world's palette.fog color. A cheap, fully self-contained stand-in for
 * volumetric ground fog (no external textures/CDN).
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/nexus/nexusConstants";

interface GroundFogProps {
  /** Roughly how far the mist should spread from the origin. */
  radius: number;
  color: THREE.ColorRepresentation;
  layers?: number;
  opacity?: number;
  seed?: number;
}

export default function GroundFog({ radius, color, layers = 5, opacity = 0.16, seed = 42 }: GroundFogProps) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);

  const discs = useMemo(() => {
    const rng = mulberry32(seed);
    return Array.from({ length: layers }, () => ({
      y: 0.4 + rng() * 3.2,
      r: radius * (0.5 + rng() * 0.6),
      x: (rng() - 0.5) * radius * 0.6,
      z: (rng() - 0.5) * radius * 0.6,
      driftPhase: rng() * Math.PI * 2,
      driftSpeed: 0.04 + rng() * 0.06,
      rotSpeed: (rng() - 0.5) * 0.01,
    }));
  }, [layers, radius, seed]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    discs.forEach((d, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.position.x = d.x + Math.sin(t * d.driftSpeed + d.driftPhase) * radius * 0.08;
      m.position.z = d.z + Math.cos(t * d.driftSpeed * 0.8 + d.driftPhase) * radius * 0.08;
      m.rotation.z += d.rotSpeed;
    });
  });

  return (
    <group name="ground-fog">
      {discs.map((d, i) => (
        <mesh
          key={i}
          position={[d.x, d.y, d.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <circleGeometry args={[d.r, 32]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
