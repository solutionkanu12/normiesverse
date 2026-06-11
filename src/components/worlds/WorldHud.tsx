"use client";

/**
 * WorldHud — DOM overlay for a generated world. Pointer-events are off so
 * clicks fall through to the canvas (pointer lock), except the lore panel and
 * exit link. Shows world identity, the Reality Core objective, a lore panel
 * (toggle with L) built from on-chain history, controls, a click-to-play
 * prompt, and the return-to-Nexus exit.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { LoreChapter } from "@/systems/normie/LoreGenerator";
import type { WorldKind } from "@/store/useWorldStore";
import QuestTrackerPanel from "@/components/quests/QuestTrackerPanel";
import QuestLogPanel from "@/components/quests/QuestLogPanel";
import QuestDialogueToast from "@/components/quests/QuestDialogueToast";
import RewardScreen from "@/components/quests/RewardScreen";

interface WorldHudProps {
  worldKind: WorldKind;
  label: string;
  accent: string;
  normieId: number;
  level: number;
  /** Canvas Action Points — quest energy. */
  actionPoints: number;
  architecture: string;
  density: number;
  fillTier: string;
  enemyCount: number;
  hiddenAreaUnlocked: boolean;
  locked: boolean;
  coreCollected: boolean;
  /** True briefly right after collecting the core (drives the toast). */
  justCollected: boolean;
  lore: LoreChapter[];
  loreLoading: boolean;
  loreError: string | null;
}

export default function WorldHud({
  worldKind,
  label,
  accent,
  normieId,
  level,
  actionPoints,
  architecture,
  density,
  fillTier,
  enemyCount,
  hiddenAreaUnlocked,
  locked,
  coreCollected,
  justCollected,
  lore,
  loreLoading,
  loreError,
}: WorldHudProps) {
  const [loreOpen, setLoreOpen] = useState(false);

  // Toggle the lore panel with L.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyL") setLoreOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top-left: world identity */}
      <div className="absolute top-5 left-6 font-hud text-[11px] leading-6 tracking-[0.2em]" style={{ color: accent }}>
        {label.toUpperCase()}
        <br />
        <span className="text-white/45">
          DENSITY: {(density * 100).toFixed(0)}% · {fillTier.toUpperCase()}
          <br />
          ARCH: {architecture.toUpperCase()}
          <br />
          HOSTILES: {enemyCount}
          {hiddenAreaUnlocked && (
            <>
              <br />
              <span style={{ color: accent }}>◈ HIDDEN CACHE UNLOCKED (LVL {level})</span>
            </>
          )}
        </span>
      </div>

      {/* Top-right: walker + objective */}
      <div className="absolute top-5 right-6 text-right font-hud text-[11px] leading-6 tracking-[0.2em] text-white/50">
        WALKER: NORMIE #{normieId}
        <br />
        CANVAS LEVEL: {level}
        <br />
        ENERGY: {actionPoints} AP
        <br />
        REALITY CORE:{" "}
        <span style={{ color: coreCollected ? accent : "#ff6b6b" }}>
          {coreCollected ? "RECOVERED" : "MISSING"}
        </span>
      </div>

      {/* Active quests + objectives */}
      <QuestTrackerPanel worldKind={worldKind} accent={accent} />

      {/* Crosshair while playing */}
      {locked && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-5 left-6 font-hud text-[10px] leading-5 tracking-[0.18em] text-white/35 uppercase">
        WASD move · Shift sprint · Space jump · Mouse look · L lore · Esc release
      </div>

      {/* Reality Core collected toast */}
      <AnimatePresence>
        {justCollected && (
          <motion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="text-2xl sm:text-3xl tracking-[0.2em]"
              style={{ fontFamily: "var(--font-lilita), cursive", color: accent }}
            >
              REALITY CORE RECOVERED
            </div>
            <p className="font-hud text-[11px] tracking-[0.3em] text-white/60 mt-2 uppercase">
              A fragment of this universe is yours
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lore panel (toggle L) */}
      <AnimatePresence>
        {loreOpen && (
          <motion.div
            className="pointer-events-auto absolute top-0 right-0 h-full w-[min(92vw,420px)] bg-[#03040a]/92 backdrop-blur-md border-l overflow-y-auto"
            style={{ borderColor: `${accent}44` }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="font-hud text-[11px] tracking-[0.3em] uppercase" style={{ color: accent }}>
                  ◢ Reality Archive
                </div>
                <button
                  type="button"
                  onClick={() => setLoreOpen(false)}
                  className="text-white/40 hover:text-white/80 text-sm transition-colors"
                >
                  ✕
                </button>
              </div>

              {loreLoading ? (
                <p className="font-hud text-[11px] tracking-[0.2em] text-white/40 uppercase">
                  Decoding on-chain history…
                </p>
              ) : loreError ? (
                <p className="text-red-400/80 text-sm">{loreError}</p>
              ) : (
                <div className="flex flex-col gap-6">
                  {lore.map((ch, i) => (
                    <div key={i}>
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <h3 className="text-white text-base" style={{ fontFamily: "var(--font-lilita), cursive" }}>
                          {ch.title}
                        </h3>
                        {ch.date && <span className="font-hud text-[10px] text-white/30">{ch.date}</span>}
                      </div>
                      <p className="text-white/65 text-sm leading-relaxed">{ch.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lore button (visible when not playing, so it's clickable) */}
      {!loreOpen && (
        <button
          type="button"
          onClick={() => setLoreOpen(true)}
          className="pointer-events-auto absolute bottom-5 left-1/2 -translate-x-1/2 font-hud text-[10px] tracking-[0.2em] uppercase border px-4 py-1.5 transition-colors hover:bg-white/5"
          style={{ borderColor: `${accent}55`, color: accent }}
        >
          ◢ Reality Archive · L
        </button>
      )}

      {/* Click-to-play prompt */}
      {!locked && !loreOpen && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#03040a]/55 backdrop-blur-[2px]">
          <div className="text-2xl tracking-wide mb-3" style={{ fontFamily: "var(--font-lilita), cursive", color: accent }}>
            {label}
          </div>
          <p className="text-white/55 text-sm">Click to look around · WASD to move</p>
        </div>
      )}

      {/* Exit to Nexus */}
      <Link
        href="/game"
        className="pointer-events-auto absolute bottom-5 right-6 z-10 font-hud text-[10px] tracking-[0.2em] text-white/30 hover:text-white/70 transition-colors uppercase"
      >
        ← Return to Nexus
      </Link>

      {/* Quest journal (toggle J), dialogue toasts, and the Reality Core reward screen */}
      <QuestLogPanel worldKind={worldKind} accent={accent} />
      <QuestDialogueToast accent={accent} />
      <RewardScreen />
    </div>
  );
}
