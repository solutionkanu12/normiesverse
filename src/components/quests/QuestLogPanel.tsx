"use client";

/**
 * QuestLogPanel — full quest journal (toggle J), slides in from the left so
 * it doesn't collide with the Reality Archive (L, right side). Shows each
 * quest's dialogue/lore, objectives + progress, status, and reward.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuestStore } from "@/store/useQuestStore";
import type { WorldKind } from "@/store/useWorldStore";
import type { QuestStatus } from "@/systems/quest/questTypes";

interface QuestLogPanelProps {
  worldKind: WorldKind;
  accent: string;
}

const STATUS_LABEL: Record<QuestStatus, string> = {
  locked: "LOCKED",
  active: "ACTIVE",
  completed: "COMPLETE",
};

const STATUS_COLOR: Record<QuestStatus, string> = {
  locked: "#666b78",
  active: "#c9a84c",
  completed: "#00ff9d",
};

const MAIN_OBJECTIVE_ID = "recover-core";

export default function QuestLogPanel({ worldKind, accent }: QuestLogPanelProps) {
  const [open, setOpen] = useState(false);
  const quests = useQuestStore((s) => s.quests).filter((q) => q.worldKind === worldKind);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyJ") setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="pointer-events-auto absolute top-0 left-0 h-full w-[min(92vw,420px)] bg-[#03040a]/92 backdrop-blur-md border-r overflow-y-auto"
            style={{ borderColor: `${accent}44` }}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="font-hud text-[11px] tracking-[0.3em] uppercase" style={{ color: accent }}>
                  ◢ Quest Log
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-white/40 hover:text-white/80 text-sm transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {quests.map((q) => (
                  <div key={q.id}>
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <h3 className="text-white text-base" style={{ fontFamily: "var(--font-lilita), cursive" }}>
                        {q.title}
                      </h3>
                      <span className="font-hud text-[10px] tracking-[0.2em]" style={{ color: STATUS_COLOR[q.status] }}>
                        {STATUS_LABEL[q.status]}
                      </span>
                    </div>
                    <p className="text-white/65 text-sm leading-relaxed mb-2">{q.dialogue}</p>
                    {q.status !== "locked" && (
                      <>
                        <ul className="flex flex-col gap-1 mb-2">
                          {q.objectives.map((o) => (
                            <li key={o.id} className="text-white/50 text-[12px] leading-relaxed flex items-start gap-2">
                              <span style={{ color: o.done ? "#00ff9d" : accent }}>{o.done ? "✓" : "○"}</span>
                              <span>
                                {o.description}
                                {o.id !== MAIN_OBJECTIVE_ID && (
                                  <span className="text-white/30"> ({o.consumedTargets.length}/{o.targetCount})</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <div className="font-hud text-[10px] tracking-[0.2em] text-white/35 uppercase">
                          Reward: {q.reward.actionPoints} AP · {q.reward.experience} XP
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto absolute bottom-14 left-6 font-hud text-[10px] tracking-[0.2em] uppercase border px-4 py-1.5 transition-colors hover:bg-white/5"
          style={{ borderColor: `${accent}55`, color: accent }}
        >
          ◢ Quest Log · J
        </button>
      )}
    </>
  );
}
