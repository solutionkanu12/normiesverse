"use client";

/**
 * AchievementToast — drains useAchievementStore.queue one at a time,
 * top-right under the MuteButton. Plays the achievement chime on display.
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAchievementStore } from "@/store/useAchievementStore";
import { getAchievement } from "@/systems/progression/AchievementSystem";
import { AudioManager } from "@/systems/audio/AudioManager";

const DISPLAY_MS = 4200;

export default function AchievementToast() {
  const queue = useAchievementStore((s) => s.queue);
  const dequeue = useAchievementStore((s) => s.dequeue);
  const current = queue[0] ? getAchievement(queue[0]) : null;

  useEffect(() => {
    if (!current) return;
    AudioManager.playSfx("achievement");
    const timer = window.setTimeout(dequeue, DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [current, dequeue]);

  return (
    <div className="pointer-events-none fixed top-20 right-4 z-50 w-[min(90vw,300px)]">
      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="border border-[#c9a84c]/50 bg-[#03040a]/90 backdrop-blur px-4 py-3"
          >
            <div className="font-hud text-[9px] tracking-[0.3em] text-[#c9a84c] uppercase mb-1">
              ◈ Achievement Unlocked
            </div>
            <div className="text-white text-sm font-semibold mb-0.5">{current.title}</div>
            <p className="text-white/55 text-xs leading-relaxed">{current.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
