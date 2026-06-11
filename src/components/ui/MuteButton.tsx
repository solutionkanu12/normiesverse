"use client";

/**
 * MuteButton — fixed, top-right global toggle for useAudioStore.muted.
 * Always on top (z-50) so it's reachable from landing, selection, Nexus,
 * worlds, and the boss arena alike.
 */
import { useAudioStore } from "@/store/useAudioStore";

export default function MuteButton() {
  const muted = useAudioStore((s) => s.muted);
  const toggleMuted = useAudioStore((s) => s.toggleMuted);

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-label={muted ? "Unmute audio" : "Mute audio"}
      aria-pressed={muted}
      className="fixed top-4 right-4 z-50 flex h-9 w-9 items-center justify-center border border-[#4fc3f7]/25 bg-[#03040a]/70 text-[#4fc3f7] backdrop-blur transition-colors hover:border-[#4fc3f7]/70 hover:bg-[#4fc3f7]/10"
    >
      {muted ? <SpeakerOffIcon /> : <SpeakerOnIcon />}
    </button>
  );
}

function SpeakerOnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 9 8 9 13 4 13 20 8 15 3 15 3 9" fill="currentColor" stroke="none" />
      <path d="M16 8.5a4.5 4.5 0 0 1 0 7" />
      <path d="M18.5 6a8 8 0 0 1 0 12" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 9 8 9 13 4 13 20 8 15 3 15 3 9" fill="currentColor" stroke="none" />
      <line x1="16" y1="9" x2="22" y2="15" />
      <line x1="22" y1="9" x2="16" y2="15" />
    </svg>
  );
}
