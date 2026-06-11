"use client";

/**
 * NexusHud — DOM overlay above the canvas. Pointer-events are off so clicks
 * fall through to the canvas (which requests pointer lock). Shows the station
 * readout, control hints, the NPC dialogue, a portal "Press E to Enter"
 * prompt, a crosshair, and a click-to-play prompt when the pointer isn't
 * locked.
 */
import Link from "next/link";
import { motion } from "framer-motion";
import { cssColor, type PortalDef } from "./nexusConstants";
import { GUIDE_DIALOGUE } from "./nexusDialogue";

interface NexusHudProps {
  locked: boolean;
  nearGuide: boolean;
  normieId: number;
  level: number;
  /** The portal the player is currently within range of, if any. */
  nearPortal?: PortalDef | null;
  /** True if `nearPortal`'s prerequisite Reality Core hasn't been recovered yet. */
  portalLocked?: boolean;
  /** Label of the world whose Reality Core gates `nearPortal`, if locked. */
  requiredWorldLabel?: string | null;
  /** True once all three Reality Cores are recovered — opens the Null Rift. */
  allCoresCollected?: boolean;
}

const LOCKED_COLOR = "#666b78";

export default function NexusHud({
  locked,
  nearGuide,
  normieId,
  level,
  nearPortal,
  portalLocked = false,
  requiredWorldLabel,
  allCoresCollected = false,
}: NexusHudProps) {
  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* Top-left station readout */}
      <div className="absolute top-5 left-6 font-hud text-[11px] leading-6 tracking-[0.2em] text-[#4fc3f7]/60">
        NEXUS STATION — SECTOR 0<br />
        STATUS: ONLINE<br />
        REALITIES: 10,000 ACTIVE
      </div>

      {/* Top-right identity */}
      <div className="absolute top-5 right-6 text-right font-hud text-[11px] leading-6 tracking-[0.2em] text-[#4fc3f7]/50">
        WALKER: NORMIE #{normieId}<br />
        CANVAS LEVEL: {level}<br />
        ENGINE: NORMIES API V4
      </div>

      {/* Null Rift — opens once all three Reality Cores are recovered */}
      {allCoresCollected && (
        <motion.div
          className="absolute top-6 left-1/2 -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="font-hud text-[10px] tracking-[0.3em] text-[#ff2233]/80 uppercase mb-2">
            ◈ All Reality Cores recovered — the Null Rift has opened
          </div>
          <Link
            href="/game/boss"
            className="pointer-events-auto inline-block font-hud text-[11px] tracking-[0.25em] uppercase border border-[#ff2233]/60 text-[#ff5a3c] px-5 py-2 bg-[#03040a]/70 backdrop-blur transition-colors hover:bg-[#ff2233]/10"
          >
            Confront the Null Normie →
          </Link>
        </motion.div>
      )}

      {/* Crosshair (only while playing) */}
      {locked && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#4fc3f7]/70 shadow-[0_0_8px_#4fc3f7]" />
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-5 left-6 font-hud text-[10px] leading-5 tracking-[0.18em] text-white/35 uppercase">
        WASD move · Shift sprint · Space jump · Mouse look · Esc release
      </div>

      {/* NPC dialogue */}
      {nearGuide && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[min(92vw,640px)]">
          <div className="border border-[#4fc3f7]/30 bg-[#03040a]/85 backdrop-blur px-6 py-4">
            <div className="font-hud text-[10px] tracking-[0.3em] text-[#4fc3f7] mb-2 uppercase">
              ◢ Nexus Guide
            </div>
            <p className="text-white/90 text-[15px] leading-relaxed">{GUIDE_DIALOGUE}</p>
          </div>
        </div>
      )}

      {/* Portal prompt */}
      {nearPortal && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <div
            className="border bg-[#03040a]/85 backdrop-blur px-6 py-3 text-center"
            style={{ borderColor: `${portalLocked ? LOCKED_COLOR : cssColor(nearPortal.color)}55` }}
          >
            <div
              className="font-hud text-[10px] tracking-[0.3em] mb-1.5 uppercase"
              style={{ color: portalLocked ? LOCKED_COLOR : cssColor(nearPortal.color) }}
            >
              ◈ {nearPortal.label}
            </div>
            {portalLocked ? (
              <p className="text-white/55 text-sm">
                Locked — recover the Reality Core from {requiredWorldLabel ?? "the previous reality"} first.
              </p>
            ) : (
              <p className="text-white/85 text-sm">
                Press{" "}
                <span
                  className="inline-block px-2 py-0.5 mx-0.5 border rounded font-hud text-xs"
                  style={{ borderColor: cssColor(nearPortal.color), color: cssColor(nearPortal.color) }}
                >
                  E
                </span>{" "}
                to Enter
              </p>
            )}
          </div>
        </div>
      )}

      {/* Click-to-play prompt */}
      {!locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#03040a]/55 backdrop-blur-[2px]">
          <div
            className="text-[#4fc3f7] text-2xl tracking-wide mb-3"
            style={{ fontFamily: "var(--font-lilita), cursive" }}
          >
            Enter the Nexus
          </div>
          <p className="text-white/55 text-sm">Click to look around · WASD to move</p>
        </div>
      )}
    </div>
  );
}
