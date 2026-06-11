"use client";

/**
 * BossDirector — the non-visual combat brain (one useFrame). It reads the
 * player position (store) + the live boss position (shared ref) and resolves:
 *
 *   - Player → boss: a continuous "purge" while within strike range, plus a
 *     burst on click / F. The boss is immune mid-teleport, which is what makes
 *     its phase-driven teleporting a real evasion mechanic.
 *   - Boss → player: phase-2 XOR pulses (brief invert + chip damage) and
 *     phase-3 void-zone drain. The player regenerates when out of danger and
 *     is revived (healed) rather than hard-failing, so the fight stays winnable.
 *
 * HP writes to both stores are accumulated and flushed on a short cadence to
 * avoid per-frame React churn.
 */
import { useEffect, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useGameStore } from "@/store/useGameStore";
import type { BossStats } from "@/systems/combat/BossStatCalculator";
import { COMBAT, type BossRefData, type VoidZone } from "./bossConstants";

interface BossDirectorProps {
  bossRef: RefObject<BossRefData>;
  zones: VoidZone[];
  stats: BossStats;
}

const FLUSH_INTERVAL = 0.12; // seconds
const _player = new THREE.Vector3();

export default function BossDirector({ bossRef, zones, stats }: BossDirectorProps) {
  const strikeQueued = useRef(false);
  const strikeReadyAt = useRef(0);
  const xorAccum = useRef(0);
  const xorFlashUntil = useRef(0);
  const flushAccum = useRef(0);
  const bossDmgAccum = useRef(0);
  const hpDeltaAccum = useRef(0);

  const purgeDps = Math.max(COMBAT.purgeDpsMin, stats.maxHp * COMBAT.purgeDpsFrac);
  const strikeBurst = Math.max(COMBAT.strikeBurstMin, stats.maxHp * COMBAT.strikeBurstFrac);

  // Strike input: any click or F while pointer-locked.
  useEffect(() => {
    const onDown = () => {
      if (document.pointerLockElement) strikeQueued.current = true;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF") strikeQueued.current = true;
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const game = useGameStore.getState();
    const boss = game.boss;
    if (!boss.active || boss.defeated) return;

    const b = bossRef.current;
    const p = usePlayerStore.getState().position;
    _player.set(p[0], p[1], p[2]);
    const inRange = _player.distanceTo(b.pos) <= COMBAT.strikeRange;
    const canHit = inRange && !b.invuln;

    // ── Player → boss ──────────────────────────────────────────────────────
    if (canHit) bossDmgAccum.current += purgeDps * dt;
    if (strikeQueued.current) {
      strikeQueued.current = false;
      if (canHit && t >= strikeReadyAt.current) {
        bossDmgAccum.current += strikeBurst;
        strikeReadyAt.current = t + COMBAT.strikeCooldown;
      }
    }

    // ── Boss → player ──────────────────────────────────────────────────────
    let inDanger = false;

    // Phase 3: void-zone drain.
    if (boss.phase === 3) {
      for (const z of zones) {
        if (Math.hypot(p[0] - z.x, p[2] - z.z) <= z.r) {
          hpDeltaAccum.current -= COMBAT.voidDrainPerSec * dt;
          inDanger = true;
          break;
        }
      }
    }

    // Phase 2: periodic XOR pulse (invert flash + chip damage).
    if (boss.phase === 2) {
      xorAccum.current += dt;
      if (xorAccum.current >= COMBAT.xorInterval) {
        xorAccum.current = 0;
        hpDeltaAccum.current -= COMBAT.xorDamage;
        xorFlashUntil.current = t + COMBAT.xorFlashDuration;
        game.setXorFlash(true);
        inDanger = true;
      }
    } else {
      xorAccum.current = 0;
    }
    if (boss.xorFlash && t >= xorFlashUntil.current) game.setXorFlash(false);

    // Regenerate when safe.
    if (!inDanger) hpDeltaAccum.current += COMBAT.regenPerSec * dt;

    // ── Flush accumulated HP changes on a short cadence ─────────────────────
    flushAccum.current += dt;
    if (flushAccum.current >= FLUSH_INTERVAL) {
      flushAccum.current = 0;

      if (bossDmgAccum.current > 0) {
        game.damageBoss(bossDmgAccum.current);
        bossDmgAccum.current = 0;
      }

      if (Math.abs(hpDeltaAccum.current) > 0.01) {
        const ps = usePlayerStore.getState();
        const maxHp = ps.stats.maxHealth || COMBAT.playerMaxHp;
        let hp = (ps.stats.health || maxHp) + hpDeltaAccum.current;
        hpDeltaAccum.current = 0;
        if (hp <= COMBAT.reviveHp) hp = maxHp; // revive instead of hard-fail
        hp = Math.max(0, Math.min(maxHp, hp));
        ps.setStats({ health: hp });
      }
    }
  });

  return null;
}
