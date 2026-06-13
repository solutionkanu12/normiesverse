"use client";

/**
 * RewardScreen — modal shown after a Reality Core is collected. Summarizes
 * the Normie's identity (ID + Canvas Level), the main quest's reward (Action
 * Points = quest energy, Experience = transform-history depth), a lore
 * excerpt from /history/normie/{id}/versions, and which Nexus portal just
 * unlocked.
 */
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useQuestStore } from "@/store/useQuestStore";

export default function RewardScreen() {
  const rewardScreen = useQuestStore((s) => s.rewardScreen);
  const closeRewardScreen = useQuestStore((s) => s.closeRewardScreen);

  return (
    <AnimatePresence>
      {rewardScreen && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-[#03040a]/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="border bg-[#03040a]/95 px-8 py-7 w-[min(92vw,460px)] text-center"
            style={{ borderColor: `${rewardScreen.coreColor}55` }}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
          >
            <div
              className="text-2xl tracking-[0.2em] mb-1"
              style={{ fontFamily: "var(--font-lilita), cursive", color: rewardScreen.coreColor }}
            >
              REALITY CORE SECURED
            </div>
            <p className="font-hud text-[10px] tracking-[0.3em] text-white/40 uppercase mb-5">
              Normie #{rewardScreen.normieId} · Canvas Level {rewardScreen.canvasLevel}
            </p>

            {rewardScreen.loreExcerpt && (
              <p className="text-white/70 text-sm leading-relaxed mb-5">{rewardScreen.loreExcerpt}</p>
            )}

            <div className="flex justify-center gap-8 font-hud text-sm tracking-[0.2em] mb-5">
              <div>
                <div className="text-white/40 text-[10px] uppercase mb-1">Energy</div>
                <div style={{ color: rewardScreen.coreColor }}>+{rewardScreen.reward.actionPoints} AP</div>
              </div>
              <div>
                <div className="text-white/40 text-[10px] uppercase mb-1">Depth</div>
                <div style={{ color: rewardScreen.coreColor }}>+{rewardScreen.reward.experience} XP</div>
              </div>
            </div>

            {rewardScreen.nextWorldLabel && (
              <p className="text-white/55 text-xs uppercase tracking-[0.2em] mb-5">
                ◈ Portal to {rewardScreen.nextWorldLabel} unlocked in the Nexus
              </p>
            )}

            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={closeRewardScreen}
                className="font-hud text-[11px] tracking-[0.2em] uppercase border px-5 py-2 transition-colors hover:bg-white/5"
                style={{ borderColor: `${rewardScreen.coreColor}55`, color: rewardScreen.coreColor }}
              >
                Continue
              </button>
              <Link
                href="/game"
                className="font-hud text-[11px] tracking-[0.2em] uppercase border border-white/20 text-white/60 px-5 py-2 transition-colors hover:bg-white/5"
              >
                Return to Nexus
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
