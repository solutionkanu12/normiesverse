/**
 * useAchievementStore — unlocked achievement IDs (persisted) + a toast queue.
 *
 * AchievementWatcher recomputes `computeUnlocked` whenever relevant Normie /
 * progression state changes and calls `unlockMany`; AchievementToast drains
 * `queue` one at a time.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AchievementState {
  unlocked: string[];
  queue: string[];

  /** Add any newly-unlocked ids (already-unlocked ones are ignored). */
  unlockMany: (ids: string[]) => void;
  /** Pop the front of the toast queue. */
  dequeue: () => void;
  reset: () => void;
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set) => ({
      unlocked: [],
      queue: [],

      unlockMany: (ids) =>
        set((s) => {
          const fresh = ids.filter((id) => !s.unlocked.includes(id));
          if (fresh.length === 0) return {};
          return { unlocked: [...s.unlocked, ...fresh], queue: [...s.queue, ...fresh] };
        }),

      dequeue: () => set((s) => ({ queue: s.queue.slice(1) })),
      reset: () => set({ unlocked: [], queue: [] }),
    }),
    {
      name: "normiesverse-achievements",
      partialize: (s) => ({ unlocked: s.unlocked }),
    },
  ),
);
