"use client";

/**
 * AchievementsPanel — locked/unlocked grid of every achievement. Embedded in
 * the pause menu.
 */
import { useAchievementStore } from "@/store/useAchievementStore";
import { ACHIEVEMENTS } from "@/systems/progression/AchievementSystem";

export default function AchievementsPanel() {
  const unlocked = useAchievementStore((s) => s.unlocked);

  return (
    <div>
      <div className="font-hud text-[10px] tracking-[0.3em] text-[#c9a84c] uppercase mb-3">
        Achievements — {unlocked.length} / {ACHIEVEMENTS.length}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {ACHIEVEMENTS.map((a) => {
          const done = unlocked.includes(a.id);
          return (
            <div
              key={a.id}
              className={`border px-3 py-2 text-left transition-colors ${
                done ? "border-[#c9a84c]/50 bg-[#c9a84c]/5" : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className={`text-xs font-semibold mb-0.5 ${done ? "text-[#c9a84c]" : "text-white/35"}`}>
                {done ? a.title : "???"}
              </div>
              <p className={`text-[11px] leading-snug ${done ? "text-white/60" : "text-white/25"}`}>
                {done ? a.description : "Locked"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
