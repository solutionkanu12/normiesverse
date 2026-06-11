"use client";

/**
 * QuestTrackerPanel — compact HUD block listing each non-locked quest for
 * this world: its name, current objective description, and a progress
 * indicator (targets reached / required).
 */
import { useQuestStore } from "@/store/useQuestStore";
import type { WorldKind } from "@/store/useWorldStore";

interface QuestTrackerPanelProps {
  worldKind: WorldKind;
  accent: string;
}

const MAIN_OBJECTIVE_ID = "recover-core";

export default function QuestTrackerPanel({ worldKind, accent }: QuestTrackerPanelProps) {
  const quests = useQuestStore((s) => s.quests).filter((q) => q.worldKind === worldKind && q.status !== "locked");

  if (quests.length === 0) return null;

  return (
    <div className="absolute top-32 left-6 font-hud text-[11px] leading-6 tracking-[0.2em] max-w-[280px]">
      {quests.map((q) => {
        const obj = q.objectives.find((o) => !o.done);
        return (
          <div key={q.id} className="mb-3">
            <div className="uppercase" style={{ color: q.status === "completed" ? "#00ff9d" : accent }}>
              ◈ {q.title}
              {q.status === "completed" && " — COMPLETE"}
            </div>
            {obj && (
              <div className="text-white/55 normal-case tracking-normal text-[11px] leading-snug mt-0.5">
                {obj.description}
                {obj.id !== MAIN_OBJECTIVE_ID && (
                  <span className="text-white/35"> · {obj.consumedTargets.length}/{obj.targetCount}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
