"use client";

/**
 * BossHud — DOM overlay for the Null Normie fight. Pointer-events are off so
 * clicks fall through for pointer lock + striking. Shows the boss health bar +
 * phase, the player's HP, a crosshair + controls, a click-to-play prompt, and
 * the phase-2 XOR invert flash (a full-screen difference-blend pulse).
 */
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { BOSS_COLORS } from "./bossConstants";
import { COMBAT } from "./bossConstants";

interface BossHudProps {
  locked: boolean;
  normieId: number;
}

const PHASE_LABEL: Record<number, string> = {
  1: "PHASE I · AWAKENING",
  2: "PHASE II · DISTORTION",
  3: "PHASE III · COLLAPSE",
};

export default function BossHud({ locked, normieId }: BossHudProps) {
  const boss = useGameStore((s) => s.boss);
  const health = usePlayerStore((s) => s.stats.health);
  const maxHealth = usePlayerStore((s) => s.stats.maxHealth) || COMBAT.playerMaxHp;

  const hpPct = boss.maxHp > 0 ? Math.max(0, (boss.hp / boss.maxHp) * 100) : 0;
  const playerPct = Math.max(0, Math.min(100, (health / maxHealth) * 100));

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Boss health bar */}
      {boss.active && !boss.defeated && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[min(92vw,620px)] text-center">
          <div
            className="text-xl tracking-[0.34em] mb-1"
            style={{ fontFamily: "var(--font-lilita), cursive", color: BOSS_COLORS.bloodRed }}
          >
            NULL NORMIE
          </div>
          <div className="font-hud text-[10px] tracking-[0.3em] text-white/45 uppercase mb-2">
            {PHASE_LABEL[boss.phase]}
          </div>
          <div className="h-3 w-full border border-[#ff2233]/40 bg-black/60 overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: `linear-gradient(90deg, ${BOSS_COLORS.deepRed}, ${BOSS_COLORS.bloodRed})` }}
              animate={{ width: `${hpPct}%` }}
              transition={{ duration: 0.15, ease: "linear" }}
            />
          </div>
          <div className="font-hud text-[10px] tracking-[0.2em] text-white/40 mt-1">
            {Math.ceil(boss.hp)} / {boss.maxHp}
          </div>
        </div>
      )}

      {/* Player identity (top-right) */}
      <div className="absolute top-5 right-6 text-right font-hud text-[11px] leading-6 tracking-[0.2em] text-white/50">
        WALKER: NORMIE #{normieId}
        <br />
        INTEGRITY: {Math.ceil(health)} / {maxHealth}
      </div>

      {/* Player HP bar (bottom-center) */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[min(92vw,360px)]">
        <div className="font-hud text-[9px] tracking-[0.3em] text-[#00ff9d]/70 uppercase mb-1 text-center">
          Reality Walker
        </div>
        <div className="h-2.5 w-full border border-[#00ff9d]/40 bg-black/60 overflow-hidden">
          <motion.div
            className="h-full bg-[#00ff9d]"
            animate={{ width: `${playerPct}%` }}
            transition={{ duration: 0.15, ease: "linear" }}
          />
        </div>
      </div>

      {/* Crosshair while playing */}
      {locked && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BOSS_COLORS.bloodRed, boxShadow: `0 0 8px ${BOSS_COLORS.bloodRed}` }} />
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-5 left-6 font-hud text-[10px] leading-5 tracking-[0.18em] text-white/35 uppercase">
        WASD move · Shift sprint · Space jump · Mouse look · Click / F to strike · Esc release
      </div>

      {/* Click-to-play prompt */}
      {!locked && !boss.defeated && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#03040a]/55 backdrop-blur-[2px]">
          <div className="text-2xl tracking-wide mb-3" style={{ fontFamily: "var(--font-lilita), cursive", color: BOSS_COLORS.bloodRed }}>
            The Null Normie
          </div>
          <p className="text-white/55 text-sm">Close the distance and strike · Click to begin</p>
        </div>
      )}

      {/* Phase-2 XOR invert flash */}
      <AnimatePresence>
        {boss.xorFlash && (
          <motion.div
            className="absolute inset-0 bg-white mix-blend-difference"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
