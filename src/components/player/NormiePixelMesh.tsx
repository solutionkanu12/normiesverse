"use client";

/**
 * NormiePixelMesh — low-level building blocks for the voxel avatar:
 *   - SegmentInstances: one InstancedMesh for a body part's voxels
 *   - useAvatarMaterial: builds the Type-driven PBR material
 *   - Aura: Canvas-Level-driven glow shell + light
 *   - coordinate helpers shared by the rig
 *
 * The rig itself (groups + animation) lives in NormieAvatar.tsx.
 */
import { useLayoutEffect, useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NORMIE_GRID_SIZE } from "@/api/types";
import type { MaterialConfig, Voxel } from "@/systems/normie/avatar.types";
import { createFurNormalMap } from "./avatarTextures";

const SIZE = NORMIE_GRID_SIZE; // 40
const CENTER = (SIZE - 1) / 2; // 19.5

/** Grid column → centered world X. */
export function worldX(col: number, s: number): number {
  return (col - CENTER) * s;
}

/** Grid row (0 = top) → world Y, with the bottom row resting on y≈0. */
export function worldY(row: number, s: number): number {
  return (SIZE - 1 - row) * s + s / 2;
}

/** Y of the hip line (top of the legs region) — the leg/waist pivot. */
export function hipY(s: number): number {
  return worldY(28, s);
}

// ---------------------------------------------------------------------------
// Instanced voxels for one body segment
// ---------------------------------------------------------------------------

interface SegmentInstancesProps {
  voxels: Voxel[];
  voxelSize: number;
  /** Y subtracted from each voxel so the parent group's origin is the pivot. */
  pivotY: number;
  material: THREE.Material;
}

const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();

export function SegmentInstances({ voxels, voxelSize, pivotY, material }: SegmentInstancesProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  // One shared cube geometry per segment, slightly shrunk for voxel gaps.
  const geometry = useMemo(
    () => new THREE.BoxGeometry(voxelSize * 0.96, voxelSize * 0.96, voxelSize * 0.96),
    [voxelSize],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < voxels.length; i++) {
      const { col, row } = voxels[i];
      _v.set(worldX(col, voxelSize), worldY(row, voxelSize) - pivotY, 0);
      _m.makeTranslation(_v.x, _v.y, _v.z);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = voxels.length;
    mesh.computeBoundingSphere();
  }, [voxels, voxelSize, pivotY]);

  if (voxels.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, voxels.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    />
  );
}

// ---------------------------------------------------------------------------
// Material (Type-driven)
// ---------------------------------------------------------------------------

/**
 * Build a MeshStandardMaterial from the {@link MaterialConfig}. Emissive
 * strength is boosted by the aura intensity so higher-level Normies glow more.
 */
export function useAvatarMaterial(
  config: MaterialConfig,
  auraIntensity: number,
): THREE.MeshStandardMaterial {
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color),
      roughness: config.roughness,
      metalness: config.metalness,
    });

    if (config.emissive) {
      mat.emissive = new THREE.Color(config.emissive);
      mat.emissiveIntensity = (config.emissiveIntensity ?? 1) * (0.7 + auraIntensity * 0.5);
    }

    if (config.kind === "fur") {
      const normal = createFurNormalMap();
      mat.normalMap = normal;
      mat.normalScale = new THREE.Vector2(config.normalScale ?? 0.7, config.normalScale ?? 0.7);
    }

    if (config.kind === "reflective") {
      mat.envMapIntensity = 1.4;
    }

    return mat;
  }, [config, auraIntensity]);

  useEffect(
    () => () => {
      material.normalMap?.dispose();
      material.dispose();
    },
    [material],
  );

  return material;
}

// ---------------------------------------------------------------------------
// Aura (Canvas Level glow)
// ---------------------------------------------------------------------------

interface AuraProps {
  intensity: number;
  color: string;
  /** Avatar mid-height (world Y) to center the glow on. */
  centerY: number;
  /** Base radius of the glow shell (units). */
  radius?: number;
}

/**
 * Soft additive shell + point light whose strength scales with Canvas Level.
 * Gently pulses on its own clock so it reads as a living energy field.
 * Renders nothing when intensity is ~0.
 */
export function Aura({ intensity, color, centerY, radius = 1.2 }: AuraProps) {
  const shellRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const c = useMemo(() => new THREE.Color(color), [color]);

  const shellMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: c,
        transparent: true,
        opacity: Math.min(0.22, 0.06 + intensity * 0.06),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    [c, intensity],
  );
  useEffect(() => () => shellMat.dispose(), [shellMat]);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 2) * 0.04;
    if (shellRef.current) shellRef.current.scale.setScalar(radius * pulse);
    if (lightRef.current) lightRef.current.intensity = intensity * (1.4 + Math.sin(t * 2) * 0.25);
  });

  if (intensity <= 0.001) return null;

  return (
    <group position={[0, centerY, 0]} name="aura">
      <mesh ref={shellRef} scale={radius}>
        <sphereGeometry args={[1, 24, 24]} />
        <primitive object={shellMat} attach="material" />
      </mesh>
      <pointLight ref={lightRef} color={c} intensity={intensity * 1.6} distance={6} decay={2} />
    </group>
  );
}
