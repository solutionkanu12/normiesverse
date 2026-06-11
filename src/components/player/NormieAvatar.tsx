"use client";

/**
 * NormieAvatar — a proper humanoid character (Minecraft-Steve proportions)
 * skinned with the selected Normie's exact 40×40 bitmap.
 *
 * Body parts (units): head 8×8×8, torso 8×12×4, arms 4×12×4, legs 4×12×4.
 * Each part's texture is a band of the bitmap (see normieSkin):
 *   head ← rows 0–7, torso ← rows 8–19, arms ← rows 20–27 (L/R cols),
 *   legs ← rows 28–39 (L/R cols). Bit 1 = #48494b, bit 0 = #e3e5e4.
 *
 * Rig hierarchy (so limbs swing about shoulders/hips and the body leans about
 * the hip): root → upper{ head, armL, armR, torso } + legL + legR. Animation
 * comes from avatarAnimation; the aura (Canvas-Level glow) is layered on top.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AvatarAnimationState, AvatarBuild } from "@/systems/normie/avatar.types";
import { Aura } from "./NormiePixelMesh";
import { applyAvatarAnimation } from "./avatarAnimation";
import { BODY, UNIT, buildSkin } from "./normieSkin";

interface NormieAvatarProps {
  build: AvatarBuild;
  animation?: AvatarAnimationState;
}

// Pre-scaled proportions (world units).
const HEAD = [BODY.head.w * UNIT, BODY.head.h * UNIT, BODY.head.d * UNIT] as const;
const TORSO = [BODY.torso.w * UNIT, BODY.torso.h * UNIT, BODY.torso.d * UNIT] as const;
const ARM = [BODY.arm.w * UNIT, BODY.arm.h * UNIT, BODY.arm.d * UNIT] as const;
const LEG = [BODY.leg.w * UNIT, BODY.leg.h * UNIT, BODY.leg.d * UNIT] as const;

const HIP = BODY.hipY * UNIT; // hip pivot height
const NECK = BODY.neckY * UNIT; // neck / shoulder height
const ARM_X = BODY.armX * UNIT;
const LEG_X = BODY.legX * UNIT;

// Within the `upper` group (origin at the hip), heights are relative to HIP.
const TORSO_REL_Y = (BODY.torso.h / 2) * UNIT; // torso center above hip
const NECK_REL_Y = NECK - HIP; // neck above hip
const HEAD_REL_Y = (BODY.head.h / 2) * UNIT; // head center above neck
const ARM_REL_Y = -(BODY.arm.h / 2) * UNIT; // arm center below shoulder pivot
const LEG_REL_Y = -(BODY.leg.h / 2) * UNIT; // leg center below hip pivot

export default function NormieAvatar({ build, animation = "idle" }: NormieAvatarProps) {
  // Build per-part skin materials from the exact bitmap; rebuild only when the
  // Normie (pixels) or its material kind changes.
  const skin = useMemo(
    () => buildSkin(build.pixels, build.material, build.auraIntensity, build.accent),
    [build.pixels, build.material, build.auraIntensity, build.accent],
  );
  useEffect(() => () => skin.dispose(), [skin]);

  const centerY = (BODY.totalH / 2) * UNIT;

  // Rig refs.
  const root = useRef<THREE.Group>(null);
  const upper = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);

  useFrame((state) => {
    applyAvatarAnimation(animation, state.clock.elapsedTime, {
      root: root.current,
      upper: upper.current,
      head: head.current,
      armL: armL.current,
      armR: armR.current,
      legL: legL.current,
      legR: legR.current,
    });
  });

  return (
    <group ref={root} name={`normie-avatar-${build.normieId}`}>
      {/* Upper body — pivots at the hip (leans for run/jump) */}
      <group ref={upper} position={[0, HIP, 0]}>
        {/* Torso */}
        <mesh position={[0, TORSO_REL_Y, 0]} material={skin.torso} castShadow receiveShadow>
          <boxGeometry args={[TORSO[0], TORSO[1], TORSO[2]]} />
        </mesh>

        {/* Head — pivots at the neck (breathing nod) */}
        <group ref={head} position={[0, NECK_REL_Y, 0]}>
          <mesh position={[0, HEAD_REL_Y, 0]} material={skin.head} castShadow receiveShadow>
            <boxGeometry args={[HEAD[0], HEAD[1], HEAD[2]]} />
          </mesh>
        </group>

        {/* Arms — pivot at the shoulders */}
        <group ref={armL} position={[-ARM_X, NECK_REL_Y, 0]}>
          <mesh position={[0, ARM_REL_Y, 0]} material={skin.armL} castShadow receiveShadow>
            <boxGeometry args={[ARM[0], ARM[1], ARM[2]]} />
          </mesh>
        </group>
        <group ref={armR} position={[ARM_X, NECK_REL_Y, 0]}>
          <mesh position={[0, ARM_REL_Y, 0]} material={skin.armR} castShadow receiveShadow>
            <boxGeometry args={[ARM[0], ARM[1], ARM[2]]} />
          </mesh>
        </group>
      </group>

      {/* Legs — pivot at the hips */}
      <group ref={legL} position={[-LEG_X, HIP, 0]}>
        <mesh position={[0, LEG_REL_Y, 0]} material={skin.legL} castShadow receiveShadow>
          <boxGeometry args={[LEG[0], LEG[1], LEG[2]]} />
        </mesh>
      </group>
      <group ref={legR} position={[LEG_X, HIP, 0]}>
        <mesh position={[0, LEG_REL_Y, 0]} material={skin.legR} castShadow receiveShadow>
          <boxGeometry args={[LEG[0], LEG[1], LEG[2]]} />
        </mesh>
      </group>

      {/* Canvas-Level aura */}
      <Aura intensity={build.auraIntensity} color={build.accent} centerY={centerY} radius={centerY * 1.2} />
    </group>
  );
}
