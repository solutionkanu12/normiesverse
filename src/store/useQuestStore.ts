/**
 * useQuestStore — active quests, objective progress, dialogue, and the
 * Reality Core reward screen.
 *
 * Quests are generated per-world by QuestFactory (from traits + Canvas data +
 * canvas/diff + transform-history version count) and registered once via
 * `setQuestsForWorld`. Objective progress is updated by QuestTracker
 * (proximity) or directly via `completeObjective` (Reality Core pickup).
 */
import { create } from "zustand";
import type { WorldKind } from "./useWorldStore";
import type { Quest, QuestReward } from "@/systems/quest/questTypes";

export interface RewardScreenData {
  worldKind: WorldKind;
  normieId: number;
  canvasLevel: number;
  reward: QuestReward;
  coreColor: string;
  loreExcerpt?: string;
  /** Label of the Nexus portal that just unlocked, if any. */
  nextWorldLabel?: string | null;
}

export interface QuestDialogue {
  questId: string;
  title: string;
  text: string;
}

/** A completion requested before its quest was registered (see {@link QuestState.completeObjective}). */
interface PendingCompletion {
  questId: string;
  objectiveId: string;
}

export interface QuestState {
  quests: Quest[];
  rewardScreen: RewardScreenData | null;
  dialogue: QuestDialogue | null;
  /** Completions requested for quests not yet registered via setQuestsForWorld. */
  pendingCompletions: PendingCompletion[];

  /** Replace all quests for one world (called once after generation). */
  setQuestsForWorld: (kind: WorldKind, quests: Quest[]) => void;
  /** Mark an objective fully done (e.g. Reality Core pickup). */
  completeObjective: (questId: string, objectiveId: string) => void;
  /** Mark one target of an objective as reached (proximity-driven). */
  incrementObjectiveProgress: (questId: string, objectiveId: string, targetIndex: number) => void;
  openRewardScreen: (data: RewardScreenData) => void;
  closeRewardScreen: () => void;
  pushDialogue: (dialogue: QuestDialogue) => void;
  clearDialogue: () => void;
  reset: () => void;
}

const initial = {
  quests: [] as Quest[],
  rewardScreen: null as RewardScreenData | null,
  dialogue: null as QuestDialogue | null,
  pendingCompletions: [] as PendingCompletion[],
};

/** A quest with no `locked` status is "completed" once every objective is done. */
function recomputeStatus(q: Quest): Quest {
  if (q.status === "locked") return q;
  const allDone = q.objectives.length > 0 && q.objectives.every((o) => o.done);
  return allDone && q.status !== "completed" ? { ...q, status: "completed" } : q;
}

/** Mark `objectiveId` fully done on `q` and recompute its status. */
function markObjectiveDone(q: Quest, objectiveId: string): Quest {
  const objectives = q.objectives.map((o) =>
    o.id === objectiveId ? { ...o, done: true, consumedTargets: o.targets.map((_, i) => i) } : o,
  );
  return recomputeStatus({ ...q, objectives });
}

export const useQuestStore = create<QuestState>((set) => ({
  ...initial,

  setQuestsForWorld: (kind, quests) =>
    set((s) => {
      // Apply any completions that arrived before these quests were registered
      // (e.g. the Reality Core was reached before /history + /canvas/diff resolved).
      const resolved = quests.map((q) => {
        const matches = s.pendingCompletions.filter((p) => p.questId === q.id);
        return matches.reduce((acc, p) => markObjectiveDone(acc, p.objectiveId), q);
      });
      const pendingCompletions = s.pendingCompletions.filter(
        (p) => !resolved.some((q) => q.id === p.questId),
      );
      return {
        quests: [...s.quests.filter((q) => q.worldKind !== kind), ...resolved],
        pendingCompletions,
      };
    }),

  completeObjective: (questId, objectiveId) =>
    set((s) => {
      const target = s.quests.find((q) => q.id === questId);
      if (!target) {
        // Quest not registered yet — remember this completion for setQuestsForWorld.
        if (s.pendingCompletions.some((p) => p.questId === questId && p.objectiveId === objectiveId)) return s;
        return { pendingCompletions: [...s.pendingCompletions, { questId, objectiveId }] };
      }
      return {
        quests: s.quests.map((q) => (q.id === questId ? markObjectiveDone(q, objectiveId) : q)),
      };
    }),

  incrementObjectiveProgress: (questId, objectiveId, targetIndex) =>
    set((s) => ({
      quests: s.quests.map((q) => {
        if (q.id !== questId) return q;
        const objectives = q.objectives.map((o) => {
          if (o.id !== objectiveId || o.done || o.consumedTargets.includes(targetIndex)) return o;
          const consumedTargets = [...o.consumedTargets, targetIndex];
          const done = consumedTargets.length >= o.targetCount;
          return { ...o, consumedTargets, done };
        });
        return recomputeStatus({ ...q, objectives });
      }),
    })),

  openRewardScreen: (data) => set({ rewardScreen: data }),
  closeRewardScreen: () => set({ rewardScreen: null }),
  pushDialogue: (dialogue) => set({ dialogue }),
  clearDialogue: () => set({ dialogue: null }),
  reset: () => set({ ...initial }),
}));
