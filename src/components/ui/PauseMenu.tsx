"use client";

/**
 * PauseMenu — Escape-key overlay shown during gameplay (/game/*). Freezes the
 * active PlayerController (via useGameStore.paused), and surfaces the run's
 * live state: stats from usePlayerStore (seeded by the selected Normie's
 * Canvas Level/Action Points), Reality Core progress, achievement progress,
 * audio settings, and controls.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/store/useGameStore";
import { useAudioStore } from "@/store/useAudioStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useNormieStore } from "@/store/useNormieStore";
import { useQuestStore } from "@/store/useQuestStore";
import { useWorldStore } from "@/store/useWorldStore";
import { useAchievementStore } from "@/store/useAchievementStore";
import AchievementsPanel from "./AchievementsPanel";

export default function PauseMenu() {
  const pathname = usePathname();
  const inGame = pathname.startsWith("/game");

  const paused = useGameStore((s) => s.paused);
  const setPaused = useGameStore((s) => s.setPaused);
  const togglePause = useGameStore((s) => s.togglePause);

  const muted = useAudioStore((s) => s.muted);
  const setMuted = useAudioStore((s) => s.setMuted);
  const volume = useAudioStore((s) => s.volume);
  const setVolume = useAudioStore((s) => s.setVolume);

  const normieId = useNormieStore((s) => s.id);
  const stats = usePlayerStore((s) => s.stats);
  const realityCores = usePlayerStore((s) => s.realityCores);

  // The Reality Core reward screen takes priority — while it's open the pause
  // menu is suppressed and Escape is ignored so it can't cover the reward.
  const rewardOpen = useQuestStore((s) => s.rewardScreen !== null);

  // Leaving the gameplay routes implicitly closes the menu so a stale
  // `paused: true` doesn't freeze the next scene's PlayerController.
  useEffect(() => {
    if (!inGame && paused) setPaused(false);
  }, [inGame, paused, setPaused]);

  useEffect(() => {
    if (!inGame) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape" && !rewardOpen) togglePause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [inGame, togglePause, rewardOpen]);

  if (!inGame || rewardOpen) return null;

  const close = () => setPaused(false);

  // Switching Normie wipes all run state so the next Normie starts fresh —
  // no carried-over Reality Cores, quests, world, boss runtime, or avatar.
  const handleChangeNormie = () => {
    setPaused(false);
    usePlayerStore.getState().reset();
    useQuestStore.getState().reset();
    useGameStore.getState().reset();
    useWorldStore.getState().reset();
    useNormieStore.getState().reset();
    useAchievementStore.getState().reset();
  };

  return (
    <AnimatePresence>
      {paused && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#03040a]/80 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        >
          <motion.div
            className="max-h-[88vh] w-[min(92vw,520px)] overflow-y-auto border border-[#4fc3f7]/30 bg-[#03040a]/95 px-7 py-6"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="mb-1 text-2xl tracking-[0.2em] text-[#4fc3f7]"
              style={{ fontFamily: "var(--font-lilita), cursive" }}
            >
              PAUSED
            </h2>
            {normieId != null && (
              <p className="mb-5 font-hud text-[10px] uppercase tracking-[0.3em] text-white/40">
                Normie #{normieId} · Canvas Level {stats.level}
              </p>
            )}

            {/* Run stats */}
            <div className="mb-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <Stat label="Health" value={`${Math.round(stats.health)}/${stats.maxHealth}`} color="#ff5a3c" />
              <Stat label="Energy" value={`${stats.actionPoints}/${stats.maxActionPoints}`} color="#00ff9d" />
              <Stat label="Level" value={stats.level} color="#c9a84c" />
              <Stat label="Cores" value={`${realityCores.length}/3`} color="#4fc3f7" />
            </div>

            {/* Audio */}
            <div className="mb-6">
              <div className="mb-3 font-hud text-[10px] uppercase tracking-[0.3em] text-[#4fc3f7]">Audio</div>
              <div className="mb-3 flex items-center justify-between gap-4">
                <label htmlFor="pause-mute" className="text-sm text-white/70">
                  Muted
                </label>
                <input
                  id="pause-mute"
                  type="checkbox"
                  checked={muted}
                  onChange={(e) => setMuted(e.target.checked)}
                  className="h-4 w-4 accent-[#4fc3f7]"
                />
              </div>
              <div className="flex items-center gap-3">
                <label htmlFor="pause-volume" className="shrink-0 text-sm text-white/70">
                  Volume
                </label>
                <input
                  id="pause-volume"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full accent-[#4fc3f7]"
                />
              </div>
            </div>

            {/* Achievements */}
            <div className="mb-6">
              <AchievementsPanel />
            </div>

            {/* Controls reference */}
            <div className="mb-6">
              <div className="mb-3 font-hud text-[10px] uppercase tracking-[0.3em] text-[#4fc3f7]">Controls</div>
              <p className="text-xs leading-relaxed text-white/50">
                WASD move · Shift sprint · Space jump · Mouse look · E interact · Esc pause
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={close}
                className="border border-[#4fc3f7]/50 px-5 py-2 font-hud text-[11px] uppercase tracking-[0.2em] text-[#4fc3f7] transition-colors hover:bg-[#4fc3f7]/10"
              >
                Resume
              </button>
              {pathname !== "/game" && (
                <Link
                  href="/game"
                  onClick={close}
                  className="border border-white/20 px-5 py-2 font-hud text-[11px] uppercase tracking-[0.2em] text-white/60 transition-colors hover:bg-white/5"
                >
                  Return to Nexus
                </Link>
              )}
              <Link
                href="/select"
                onClick={handleChangeNormie}
                className="border border-white/20 px-5 py-2 font-hud text-[11px] uppercase tracking-[0.2em] text-white/60 transition-colors hover:bg-white/5"
              >
                Change Normie
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="border border-white/10 px-2 py-2">
      <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="text-sm" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
