/**
 * useAudioStore — global audio settings and current track.
 *
 * `muted` and `volume` persist to localStorage so a player's preference
 * survives reloads/navigations. AudioController (Phase 11) is the sole
 * writer of `currentTrack` — UI only reads it.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AudioState {
  muted: boolean;
  /** Master volume, 0..1. */
  volume: number;
  /** Identifier of the currently playing ambient track, or null. */
  currentTrack: string | null;

  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setVolume: (volume: number) => void;
  setTrack: (currentTrack: string | null) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      muted: false,
      volume: 0.7,
      currentTrack: null,
      setMuted: (muted) => set({ muted }),
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setTrack: (currentTrack) => set({ currentTrack }),
    }),
    {
      name: "normiesverse-audio",
      partialize: (s) => ({ muted: s.muted, volume: s.volume }),
    },
  ),
);
