"use client";

/**
 * PortalTransition — cinematic DOM overlay shown when the player steps
 * through a portal. Layers a color flash, a radial-blur vignette, and a
 * loading screen (spinner + progress bar) themed to the portal's color, then
 * calls `onComplete` once the sequence finishes so the parent can save the
 * destination and navigate.
 *
 * The 3D distortion (canvas blur/zoom) is handled by NexusWorld, which wraps
 * the Canvas in its own animated container — this component only owns the
 * DOM-layer effects and the completion timer.
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cssColor, type PortalDef } from "./nexusConstants";

interface PortalTransitionProps {
  portal: PortalDef | null;
  onComplete: () => void;
}

/** Total time before navigating away — keep in sync with the canvas distortion timing. */
const TOTAL_DURATION_MS = 2200;

export default function PortalTransition({ portal, onComplete }: PortalTransitionProps) {
  useEffect(() => {
    if (!portal) return;
    const timer = window.setTimeout(onComplete, TOTAL_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [portal, onComplete]);

  return (
    <AnimatePresence>
      {portal && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Color flash */}
          <motion.div
            className="absolute inset-0"
            style={{ background: cssColor(portal.color) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.25] }}
            transition={{ duration: 0.6, times: [0, 0.35, 1], ease: "easeOut" }}
          />

          {/* Radial blur vignette — sharper at center, blurs/darkens toward the edges */}
          <motion.div
            className="absolute -inset-[10%] backdrop-blur-2xl"
            style={{
              background: `radial-gradient(circle, transparent 0%, ${cssColor(portal.color)}33 45%, #03040a 100%)`,
              maskImage: "radial-gradient(circle, transparent 15%, black 70%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 15%, black 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          />

          {/* Loading screen */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div
                className="absolute inset-0 rounded-full border-2 animate-spin"
                style={{ borderColor: `${cssColor(portal.color)} transparent transparent transparent` }}
              />
            </div>

            <div
              className="text-xl sm:text-2xl tracking-[0.25em] uppercase"
              style={{ fontFamily: "var(--font-lilita), cursive", color: cssColor(portal.color) }}
            >
              Entering {portal.label}
            </div>

            <div className="h-[2px] w-56 bg-white/10 overflow-hidden rounded-full">
              <motion.div
                className="h-full"
                style={{ background: cssColor(portal.color) }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 0.55, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
