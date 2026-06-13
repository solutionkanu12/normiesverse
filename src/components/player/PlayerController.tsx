"use client";

/**
 * PlayerController — the playable Reality Walker.
 *
 *   - Physics capsule (rapier), upright, gravity-driven.
 *   - WASD / arrows movement relative to camera yaw; Shift sprints.
 *   - Space jumps when grounded (downward raycast).
 *   - Pointer-lock mouse look drives a third-person orbit camera.
 *   - Renders the Phase-4 voxel avatar, animation state derived from motion.
 *   - Player position is written to usePlayerStore (throttled).
 *
 * Reports lock + guide-proximity + portal-proximity changes to the parent for
 * the HUD, and an interact (E) press while near a portal for the cinematic
 * transition. While `frozen` (mid-transition) movement input is ignored.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import type { AvatarAnimationState, AvatarBuild } from "@/systems/normie/avatar.types";
import type { PortalDef } from "@/components/nexus/nexusConstants";
import type { WorldKind } from "@/store/useWorldStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import NormieAvatar from "./NormieAvatar";
import { useKeyboardControls } from "./useKeyboardControls";

// Capsule dimensions → ~1.8u tall, matching the 2u avatar.
const CAP_HALF = 0.5;
const CAP_RADIUS = 0.4;
const FEET_OFFSET = CAP_HALF + CAP_RADIUS; // center → feet

const WALK_SPEED = 9;
const RUN_SPEED = 18;
const JUMP_VELOCITY = 11;
const MOUSE_SENS = 0.0022;
const PITCH_MIN = -0.5;
const PITCH_MAX = 1.25;
const CAM_DISTANCE = 7;
const SAVE_INTERVAL = 0.15; // seconds

interface PlayerControllerProps {
  build: AvatarBuild;
  spawn: [number, number, number];
  /** NPC guide position — omit in worlds with no guide. */
  guidePos?: [number, number, number];
  guideTriggerRadius?: number;
  portals?: PortalDef[];
  portalTriggerRadius?: number;
  /** While true, movement input is ignored (e.g. mid portal-transition). */
  frozen?: boolean;
  onLockChange?: (locked: boolean) => void;
  onNearGuideChange?: (near: boolean) => void;
  onNearPortalChange?: (portalId: WorldKind | null) => void;
  onEnterPortal?: (portalId: WorldKind) => void;
}

export default function PlayerController({
  build,
  spawn,
  guidePos,
  guideTriggerRadius = 12,
  portals = [],
  portalTriggerRadius = 5,
  frozen = false,
  onLockChange,
  onNearGuideChange,
  onNearPortalChange,
  onEnterPortal,
}: PlayerControllerProps) {
  const body = useRef<RapierRigidBody>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const keys = useKeyboardControls();
  const { rapier, world } = useRapier();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const setPosition = usePlayerStore((s) => s.setPosition);

  // Animation is the one piece of per-frame state React needs to see; it only
  // changes a handful of times, so a setState guarded by a diff is cheap.
  const [animation, setAnimation] = useState<AvatarAnimationState>("idle");

  // Look + bookkeeping refs (mutated outside React).
  const yaw = useRef(0);
  const pitch = useRef(0.3);
  const locked = useRef(false);
  const nearGuide = useRef(false);
  const nearPortal = useRef<WorldKind | null>(null);
  const saveAccum = useRef(0);

  // Scratch vectors (avoid per-frame allocation).
  const scratch = useMemo(
    () => ({
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      move: new THREE.Vector3(),
      target: new THREE.Vector3(),
      camPos: new THREE.Vector3(),
      camDir: new THREE.Vector3(),
      guide: new THREE.Vector3(...(guidePos ?? [0, 0, 0])),
      down: new THREE.Vector3(0, -1, 0),
    }),
    [guidePos],
  );

  // ── Pointer lock + mouse look ────────────────────────────────────────────
  useEffect(() => {
    const el = gl.domElement;

    const onClick = () => {
      if (!locked.current) el.requestPointerLock();
    };
    const onLockChangeEvt = () => {
      locked.current = document.pointerLockElement === el;
      onLockChange?.(locked.current);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!locked.current) return;
      yaw.current -= e.movementX * MOUSE_SENS;
      pitch.current -= e.movementY * MOUSE_SENS;
      pitch.current = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch.current));
    };

    el.addEventListener("click", onClick);
    document.addEventListener("pointerlockchange", onLockChangeEvt);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      el.removeEventListener("click", onClick);
      document.removeEventListener("pointerlockchange", onLockChangeEvt);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [gl, onLockChange]);

  // ── Interact (E): enter the portal the player is standing near ──────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyE" && nearPortal.current) {
        onEnterPortal?.(nearPortal.current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEnterPortal]);

  // ── Grounded check (downward ray, excluding self) ────────────────────────
  const isGrounded = (px: number, py: number, pz: number): boolean => {
    const origin = { x: px, y: py - FEET_OFFSET + 0.05, z: pz };
    const ray = new rapier.Ray(origin, scratch.down);
    // Exclude the player's own body so the ray reports the floor, not ourselves.
    const hit = world.castRay(ray, 0.35, true, undefined, undefined, undefined, body.current ?? undefined);
    return hit !== null && hit.timeOfImpact <= 0.35;
  };

  useFrame((_, delta) => {
    const rb = body.current;
    if (!rb) return;

    const dt = Math.min(delta, 0.05);
    const t = rb.translation();

    // Respawn if the player somehow falls into the void.
    if (t.y < -20) {
      rb.setTranslation({ x: spawn[0], y: spawn[1], z: spawn[2] }, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }

    // Mid portal-transition: stop horizontal movement, freeze the view.
    if (frozen) {
      const v = rb.linvel();
      rb.setLinvel({ x: 0, y: v.y, z: 0 }, true);
      return;
    }

    // Camera-relative basis from yaw.
    const cy = Math.cos(yaw.current);
    const sy = Math.sin(yaw.current);
    scratch.forward.set(-sy, 0, -cy); // ground forward (view dir)
    scratch.right.set(cy, 0, -sy);

    // Input → desired horizontal velocity.
    const k = keys.current;
    const fwd = (k.forward ? 1 : 0) - (k.back ? 1 : 0);
    const str = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    scratch.move.set(0, 0, 0);
    if (fwd !== 0) scratch.move.addScaledVector(scratch.forward, fwd);
    if (str !== 0) scratch.move.addScaledVector(scratch.right, str);
    const moving = scratch.move.lengthSq() > 0;
    if (moving) scratch.move.normalize();

    const speed = k.sprint ? RUN_SPEED : WALK_SPEED;
    const vel = rb.linvel();

    // Jump (grounded) — otherwise just steer horizontally and let gravity act.
    const grounded = isGrounded(t.x, t.y, t.z);
    const jumpNow = k.jump && grounded && vel.y <= 0.1;
    rb.setLinvel(
      {
        x: scratch.move.x * speed,
        y: jumpNow ? JUMP_VELOCITY : vel.y,
        z: scratch.move.z * speed,
      },
      true,
    );

    // ── Third-person camera (collision-aware: never clip through geometry) ──
    scratch.target.set(t.x, t.y + 1.4, t.z);
    const cp = Math.cos(pitch.current);
    const sp = Math.sin(pitch.current);
    // Unit direction from the player's head toward the ideal camera position.
    scratch.camDir.set(sy * cp, sp, cy * cp);
    // Cast from the head outward; if a solid is hit before CAM_DISTANCE, pull
    // the camera in to the hit point (with a small skin) so it stays in front
    // of any wall / structure / terrain. The player's own body is excluded.
    let camDist = CAM_DISTANCE;
    const camRay = new rapier.Ray(scratch.target, scratch.camDir);
    const camHit = world.castRay(camRay, CAM_DISTANCE, true, undefined, undefined, undefined, body.current ?? undefined);
    if (camHit && camHit.timeOfImpact < camDist) camDist = Math.max(1.4, camHit.timeOfImpact - 0.35);
    scratch.camPos.copy(scratch.target).addScaledVector(scratch.camDir, camDist);
    camera.position.lerp(scratch.camPos, 0.25);
    camera.lookAt(scratch.target);

    // ── Avatar facing + animation ──
    if (avatarRef.current) {
      avatarRef.current.rotation.y = Math.atan2(scratch.forward.x, scratch.forward.z);
    }
    const nextAnim: AvatarAnimationState = !grounded ? "jump" : moving ? (k.sprint ? "run" : "walk") : "idle";
    if (nextAnim !== animation) setAnimation(nextAnim);

    // ── Save position (throttled) ──
    saveAccum.current += dt;
    if (saveAccum.current >= SAVE_INTERVAL) {
      saveAccum.current = 0;
      setPosition([
        Math.round(t.x * 100) / 100,
        Math.round(t.y * 100) / 100,
        Math.round(t.z * 100) / 100,
      ]);
    }

    // ── Guide proximity (only when a guide exists) ──
    if (guidePos) {
      const near = scratch.guide.distanceTo(scratch.target) < guideTriggerRadius;
      if (near !== nearGuide.current) {
        nearGuide.current = near;
        onNearGuideChange?.(near);
      }
    }

    // ── Portal proximity (closest portal within range, by ground distance) ──
    let closestId: WorldKind | null = null;
    let closestDist = portalTriggerRadius;
    for (const p of portals) {
      const dx = t.x - p.position[0];
      const dz = t.z - p.position[2];
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < closestDist) {
        closestDist = d;
        closestId = p.id;
      }
    }
    if (closestId !== nearPortal.current) {
      nearPortal.current = closestId;
      onNearPortalChange?.(closestId);
    }
  });

  return (
    <RigidBody
      ref={body}
      position={spawn}
      colliders={false}
      enabledRotations={[false, false, false]}
      mass={1}
      linearDamping={0.4}
      canSleep={false}
    >
      <CapsuleCollider args={[CAP_HALF, CAP_RADIUS]} />
      {/* Avatar feet aligned to capsule bottom */}
      <group ref={avatarRef} position={[0, -FEET_OFFSET, 0]}>
        <NormieAvatar build={build} animation={animation} />
      </group>
    </RigidBody>
  );
}
