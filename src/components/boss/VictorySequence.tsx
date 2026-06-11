"use client";

/**
 * VictorySequence — the ending. After the Null Normie dissolves, the three
 * Reality Cores ignite in unison, the screen fills with the player's own
 * Normie pixel art (the official composite from the Normies API), and the
 * restoration is declared. Shows Canvas Level + stats and a route back to the
 * Nexus.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { getImagePngUrl } from "@/api/normiesApi";
import { cssColor, PORTALS } from "@/components/nexus/nexusConstants";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useGameStore } from "@/store/useGameStore";
import { BOSS_COLORS } from "./bossConstants";

interface VictorySequenceProps {
  normieId: number;
}

export default function VictorySequence({ normieId }: VictorySequenceProps) {
  const level = usePlayerStore((s) => s.stats.level);
  const actionPoints = usePlayerStore((s) => s.stats.actionPoints);
  const resetBoss = useGameStore((s) => s.resetBoss);
  const setPhase = useGameStore((s) => s.setPhase);

  const handleReturn = () => {
    resetBoss();
    setPhase("nexus");
  };

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-[#03040a]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2 }}
    >
      {/* Normie pixel art filling the screen */}
      <motion.img
        src={getImagePngUrl(normieId)}
        alt={`Normie #${normieId}`}
        className="absolute inset-0 m-auto h-[78vmin] w-[78vmin] object-contain opacity-25"
        style={{ imageRendering: "pixelated", filter: "drop-shadow(0 0 40px rgba(79,195,247,0.4))" }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.28 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      />

      {/* Reality Cores igniting in unison */}
      <div className="relative z-10 flex gap-6 mb-8">
        {PORTALS.map((p, i) => (
          <motion.div
            key={p.id}
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: cssColor(p.color), boxShadow: `0 0 18px ${cssColor(p.color)}` }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1], opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.15, duration: 0.8 }}
          />
        ))}
      </div>

      <motion.div
        className="relative z-10 text-center px-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.9 }}
      >
        <div className="font-hud text-[11px] tracking-[0.4em] uppercase mb-3" style={{ color: BOSS_COLORS.bloodRed }}>
          The Null Normie is unmade
        </div>
        <h1
          className="text-2xl sm:text-4xl leading-tight mb-6 max-w-[18ch] mx-auto"
          style={{ fontFamily: "var(--font-lilita), cursive", color: "#4fc3f7" }}
        >
          Reality Walker #{normieId} has restored the NormiesVerse
        </h1>

        <div className="flex justify-center gap-10 font-hud text-sm tracking-[0.2em] mb-8">
          <div>
            <div className="text-white/40 text-[10px] uppercase mb-1">Canvas Level</div>
            <div className="text-[#c9a84c] text-lg">{level}</div>
          </div>
          <div>
            <div className="text-white/40 text-[10px] uppercase mb-1">Action Points</div>
            <div className="text-[#00ff9d] text-lg">{actionPoints}</div>
          </div>
        </div>

        <Link
          href="/game"
          onClick={handleReturn}
          className="inline-block font-hud text-[12px] tracking-[0.25em] uppercase border border-[#4fc3f7]/50 text-[#4fc3f7] px-7 py-3 transition-colors hover:bg-[#4fc3f7]/10"
        >
          Return to the Nexus
        </Link>
      </motion.div>
    </motion.div>
  );
}
