"use client";

/**
 * LoadingScreen — shared full-screen loader for the Nexus, each universe, and
 * the boss arena. Accent-themed, shows a fading Normie pixel-art preview when
 * a normieId is given, an indeterminate progress sweep, and rotating tips.
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getImagePngUrl } from "@/api/normiesApi";

const DEFAULT_TIPS = [
  "Every reality in the Verse is generated from your Normie's on-chain pixel data.",
  "WASD to move · Shift to sprint · Space to jump · Mouse to look around.",
  "Press E near a glowing Reality Core to recover it.",
  "Your Normie's Canvas Level sets your starting stats and unlocks hidden areas.",
  "Press Esc at any time to pause.",
];

interface LoadingScreenProps {
  /** Hex accent color (e.g. portal/world palette accent). */
  accent: string;
  label: string;
  /** Selected Normie's token ID — shows a faint preview when given. */
  normieId?: number | null;
  tips?: string[];
}

export default function LoadingScreen({ accent, label, normieId, tips = DEFAULT_TIPS }: LoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (tips.length <= 1) return;
    const interval = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 3400);
    return () => window.clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 bg-[#03040a] px-6 text-center">
      {normieId != null && (
        <motion.img
          src={getImagePngUrl(normieId)}
          alt={`Normie #${normieId}`}
          className="h-24 w-24 object-contain"
          style={{ imageRendering: "pixelated", filter: `drop-shadow(0 0 16px ${accent}66)` }}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ duration: 0.8 }}
        />
      )}

      <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: accent, borderTopColor: "transparent" }} />

      <p className="font-hud text-[11px] tracking-[0.3em] uppercase" style={{ color: `${accent}99` }}>
        {label}
      </p>

      <div className="h-[2px] w-[min(80vw,260px)] overflow-hidden bg-white/10">
        <motion.div
          className="h-full w-1/3"
          style={{ backgroundColor: accent }}
          animate={{ x: ["-100%", "300%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="flex h-10 max-w-[min(90vw,420px)] items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="text-xs leading-relaxed text-white/35"
          >
            {tips[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
