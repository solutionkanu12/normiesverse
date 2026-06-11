"use client";

/**
 * NullNormieMesh — the Null Normie's body: a corrupted voxel sculpture built
 * from the *player's own* 40×40 bitmap (CLAUDE.md: "fragments built from the
 * player's own pixel data"). The silhouette is recognizably the player's, but
 * mirrored ("inverted") and shot through with animated glitch displacement
 * that worsens by phase. On defeat it dissolves into a burst of pixels.
 *
 * One InstancedMesh holds every "on" voxel; matrices are updated per frame for
 * the glitch / dissolve — typical Normies have only a few hundred lit pixels,
 * so this stays cheap.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NORMIE_GRID_SIZE } from "@/api/types";
import { parsePixels } from "@/systems/normie/PixelAnalyzer";
import { mulberry32 } from "@/components/nexus/nexusConstants";
import { BOSS_COLORS } from "./bossConstants";
import type { BossPhase } from "@/systems/combat/BossStatCalculator";

const SIZE = NORMIE_GRID_SIZE; // 40
const CENTER = (SIZE - 1) / 2; // 19.5
const VOXEL = 0.18; // world units per pixel → ~7u tall boss

/** Glitch displacement amplitude by phase (units). */
const GLITCH_BY_PHASE: Record<BossPhase, number> = { 1: 0.06, 2: 0.16, 3: 0.34 };
const DISSOLVE_SECONDS = 1.5;

interface VoxelDatum {
  /** Base local position (mirrored from the player's bitmap). */
  base: THREE.Vector3;
  /** Per-voxel glitch phase. */
  phase: number;
  /** Outward dissolve direction. */
  burst: THREE.Vector3;
}

interface NullNormieMeshProps {
  /** The player's 1600-char bitmap — the corruption is literally made of it. */
  pixels: string;
  phase: BossPhase;
  /** True once HP hits 0 — triggers the dissolve. */
  dissolving: boolean;
  /** Fired once when the dissolve animation finishes. */
  onDissolved?: () => void;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export default function NullNormieMesh({ pixels, phase, dissolving, onDissolved }: NullNormieMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dissolveStart = useRef<number | null>(null);
  const dissolvedFired = useRef(false);

  // Build the mirrored voxel set from the player's "on" pixels.
  const voxels = useMemo<VoxelDatum[]>(() => {
    const grid = parsePixels(pixels);
    const rng = mulberry32(grid.onCount * 2654435761);
    const out: VoxelDatum[] = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (!grid.cells[row * SIZE + col]) continue;
        const mcol = SIZE - 1 - col; // mirror horizontally ("inverted")
        const base = new THREE.Vector3((mcol - CENTER) * VOXEL, (CENTER - row) * VOXEL, 0);
        const burst = new THREE.Vector3(base.x, base.y * 0.5, (rng() - 0.5) * 2)
          .normalize()
          .multiplyScalar(0.6 + rng() * 1.4);
        out.push({ base, phase: rng() * Math.PI * 2, burst });
      }
    }
    return out;
  }, [pixels]);

  const geometry = useMemo(() => new THREE.BoxGeometry(VOXEL * 0.92, VOXEL * 0.92, VOXEL * 0.92), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(BOSS_COLORS.corruption),
        emissive: new THREE.Color(BOSS_COLORS.bloodRed),
        emissiveIntensity: 0.6,
        metalness: 0.4,
        roughness: 0.5,
        transparent: true,
        opacity: 1,
      }),
    [],
  );
  useEffect(() => {
    const g = geometry;
    const m = material;
    return () => {
      g.dispose();
      m.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    // Read the live material off the mesh (mutating it per frame is intended).
    const mat = mesh.material as THREE.MeshStandardMaterial;

    // Dissolve progress (0..1) once defeated.
    let dissolve = 0;
    if (dissolving) {
      if (dissolveStart.current == null) dissolveStart.current = t;
      dissolve = Math.min(1, (t - dissolveStart.current) / DISSOLVE_SECONDS);
      mat.opacity = 1 - dissolve;
      mat.emissiveIntensity = 0.6 + dissolve * 2.4;
      if (dissolve >= 1 && !dissolvedFired.current) {
        dissolvedFired.current = true;
        onDissolved?.();
      }
    } else {
      // Living: emissive throbs faster as the fight escalates.
      mat.emissiveIntensity = 0.5 + 0.4 * Math.sin(t * (2 + phase)) + phase * 0.15;
    }

    const glitch = GLITCH_BY_PHASE[phase];
    for (let i = 0; i < voxels.length; i++) {
      const v = voxels[i];
      // Per-voxel glitch jitter (intensifies with phase).
      const jx = Math.sin(t * (6 + phase) + v.phase) * glitch;
      const jz = Math.cos(t * (5 + phase) + v.phase * 1.7) * glitch;
      _p.set(v.base.x + jx, v.base.y, v.base.z + jz);

      let scale = 1;
      if (dissolve > 0) {
        _p.addScaledVector(v.burst, dissolve * 7);
        _p.y += dissolve * dissolve * 4; // drift upward as it disperses
        scale = 1 - dissolve;
      }
      _s.setScalar(Math.max(0.001, scale));
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (voxels.length === 0) return null;

  return <instancedMesh ref={meshRef} args={[geometry, material, voxels.length]} frustumCulled={false} castShadow />;
}
