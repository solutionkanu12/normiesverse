"use client";

/**
 * QuestDialogueToast — transient lore/dialogue box. Reads useQuestStore's
 * `dialogue` queue and auto-dismisses after a few seconds.
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuestStore } from "@/store/useQuestStore";

interface QuestDialogueToastProps {
  accent: string;
}

const DISPLAY_MS = 6000;

export default function QuestDialogueToast({ accent }: QuestDialogueToastProps) {
  const dialogue = useQuestStore((s) => s.dialogue);
  const clearDialogue = useQuestStore((s) => s.clearDialogue);

  useEffect(() => {
    if (!dialogue) return;
    const t = window.setTimeout(() => clearDialogue(), DISPLAY_MS);
    return () => window.clearTimeout(t);
  }, [dialogue, clearDialogue]);

  return (
    <AnimatePresence>
      {dialogue && (
        <motion.div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[min(92vw,640px)]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35 }}
        >
          <div className="border bg-[#03040a]/85 backdrop-blur px-6 py-4" style={{ borderColor: `${accent}44` }}>
            <div className="font-hud text-[10px] tracking-[0.3em] mb-2 uppercase" style={{ color: accent }}>
              ◢ {dialogue.title}
            </div>
            <p className="text-white/90 text-[15px] leading-relaxed">{dialogue.text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
