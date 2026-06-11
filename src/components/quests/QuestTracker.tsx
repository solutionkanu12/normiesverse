"use client";

/**
 * QuestTracker — non-visual proximity tracker for active quest objectives.
 * Mirrors RealityCore's player-position polling but for side/secret quest
 * targets. The main quest's `recover-core` objective is completed externally
 * by RealityCore's onCollect, so it's skipped here to avoid double-firing.
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useQuestStore } from "@/store/useQuestStore";
import type { WorldKind } from "@/store/useWorldStore";

interface QuestTrackerProps {
  worldKind: WorldKind;
}

const CHECK_INTERVAL = 0.25;
const MAIN_OBJECTIVE_ID = "recover-core";

export default function QuestTracker({ worldKind }: QuestTrackerProps) {
  const acc = useRef(0);

  useFrame((_state, delta) => {
    acc.current += delta;
    if (acc.current < CHECK_INTERVAL) return;
    acc.current = 0;

    const { position } = usePlayerStore.getState();
    const { quests, incrementObjectiveProgress } = useQuestStore.getState();

    for (const quest of quests) {
      if (quest.worldKind !== worldKind || quest.status !== "active") continue;
      for (const obj of quest.objectives) {
        if (obj.id === MAIN_OBJECTIVE_ID || obj.done) continue;
        obj.targets.forEach((target, i) => {
          if (obj.consumedTargets.includes(i)) return;
          const d = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
          if (d < obj.radius) {
            incrementObjectiveProgress(quest.id, obj.id, i);
          }
        });
      }
    }
  });

  return null;
}
