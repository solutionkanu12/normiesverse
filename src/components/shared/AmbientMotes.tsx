"use client";

/**
 * AmbientMotes — a slow-rising field of glowing accent-colored motes (embers,
 * ice glints, data sparks, dust) that drifts upward through a vertical band
 * and gently sways. A close-range atmosphere layer, distinct from each
 * world's existing falling weather (Rain/Snow/DataStreams) and the distant
 * Nexus/boss starfields.
 */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/components/nexus/nexusConstants";

interface AmbientMotesProps {
  /** Horizontal spread radius (motes are placed within a disc of this radius). */
  radius: number;
  /** Vertical band the motes rise through, from 0 to this height. */
  height: number;
  color: THREE.ColorRepresentation;
  count?: number;
  size?: number;
  opacity?: number;
  /** Upward drift speed (units/s). */
  rise?: number;
  seed?: number;
}

export default function AmbientMotes({
  radius,
  height,
  color,
  count = 240,
  size = 0.35,
  opacity = 0.5,
  rise = 0.6,
  seed = 7,
}: AmbientMotesProps) {
  const ref = useRef<THREE.Points>(null);
  const phases = useMemo(() => {
    const ph = new Float32Array(count);
    const rng = mulberry32(seed ^ 0x9e3779b9);
    for (let i = 0; i < count; i++) ph[i] = rng() * Math.PI * 2;
    return ph;
  }, [count, seed]);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const rng = mulberry32(seed);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * radius;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = rng() * height;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, [count, radius, height, seed]);

  useFrame((state, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const attr = pts.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += rise * delta;
      if (arr[i * 3 + 1] > height) arr[i * 3 + 1] = 0;
      arr[i * 3] += Math.sin(t * 0.4 + phases[i]) * 0.01;
      arr[i * 3 + 2] += Math.cos(t * 0.35 + phases[i]) * 0.01;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
