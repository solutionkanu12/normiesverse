/**
 * avatarAnimation — pure per-frame transform logic for the humanoid rig.
 *
 * The rig (see NormieAvatar):
 *   root
 *     upper   (pivot at the hip — leans for run)
 *       head  (pivot at the neck — breathing bob)
 *       armL / armR (pivot at the shoulders — swing)
 *     legL / legR  (pivot at the hips — swing)
 *
 * Arms and legs swing in opposite phase (arm opposite its same-side leg) for a
 * natural gait. Run is faster + higher amplitude with a forward lean; jump
 * raises the arms.
 */
import type * as THREE from "three";
import type { AvatarAnimationState } from "@/systems/normie/avatar.types";

export interface AvatarRigRefs {
  root: THREE.Group | null;
  upper: THREE.Group | null;
  head: THREE.Group | null;
  armL: THREE.Group | null;
  armR: THREE.Group | null;
  legL: THREE.Group | null;
  legR: THREE.Group | null;
}

/** Reset every animated channel to the rest pose. */
function rest(r: AvatarRigRefs): void {
  if (r.root) {
    r.root.position.y = 0;
    r.root.scale.set(1, 1, 1);
  }
  if (r.upper) r.upper.rotation.set(0, 0, 0);
  if (r.head) r.head.rotation.set(0, 0, 0);
  for (const limb of [r.armL, r.armR, r.legL, r.legR]) {
    if (limb) limb.rotation.set(0, 0, 0);
  }
}

const JUMP_PERIOD = 1.2; // seconds per hop in the looping jump preview

export function applyAvatarAnimation(
  state: AvatarAnimationState,
  t: number,
  r: AvatarRigRefs,
): void {
  rest(r);

  switch (state) {
    case "idle": {
      // Subtle breathing bob: tiny rise + chest lean + head nod.
      const s = Math.sin(t * 1.6);
      if (r.root) r.root.position.y = s * 0.01;
      if (r.upper) r.upper.rotation.x = s * 0.02;
      if (r.head) r.head.rotation.x = Math.sin(t * 1.6 + 0.4) * 0.04;
      if (r.armL) r.armL.rotation.x = s * 0.05;
      if (r.armR) r.armR.rotation.x = s * 0.05;
      break;
    }

    case "walk": {
      const swing = Math.sin(t * 7);
      const amp = 0.5;
      if (r.legL) r.legL.rotation.x = swing * amp;
      if (r.legR) r.legR.rotation.x = -swing * amp;
      // Arms opposite their same-side leg.
      if (r.armL) r.armL.rotation.x = -swing * amp;
      if (r.armR) r.armR.rotation.x = swing * amp;
      if (r.root) r.root.position.y = Math.abs(swing) * 0.03;
      if (r.upper) r.upper.rotation.x = 0.04;
      break;
    }

    case "run": {
      const swing = Math.sin(t * 11);
      const amp = 0.85;
      if (r.legL) r.legL.rotation.x = swing * amp;
      if (r.legR) r.legR.rotation.x = -swing * amp;
      if (r.armL) r.armL.rotation.x = -swing * amp;
      if (r.armR) r.armR.rotation.x = swing * amp;
      if (r.root) r.root.position.y = Math.abs(swing) * 0.06;
      // Lean the whole upper body forward.
      if (r.upper) r.upper.rotation.x = 0.32;
      break;
    }

    case "jump": {
      const p = (t % JUMP_PERIOD) / JUMP_PERIOD; // 0..1
      const arc = Math.sin(p * Math.PI); // 0 → 1 → 0
      const ground = 1 - arc;
      if (r.root) {
        r.root.position.y = arc * 0.5;
        r.root.scale.y = 1 - ground * 0.1 + arc * 0.04;
        const wide = 1 + ground * 0.07;
        r.root.scale.x = wide;
        r.root.scale.z = wide;
      }
      // Arms raise overhead; legs tuck.
      const raise = -2.3 - arc * 0.3;
      if (r.armL) {
        r.armL.rotation.x = raise;
        r.armL.rotation.z = 0.25;
      }
      if (r.armR) {
        r.armR.rotation.x = raise;
        r.armR.rotation.z = -0.25;
      }
      if (r.legL) r.legL.rotation.x = -arc * 0.5;
      if (r.legR) r.legR.rotation.x = -arc * 0.5;
      if (r.upper) r.upper.rotation.x = arc * 0.1;
      break;
    }
  }
}
