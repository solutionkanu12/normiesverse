"use client";

/**
 * AchievementWatcher — headless (renders nothing). Recomputes the unlocked
 * achievement set whenever Normie/progression state changes and feeds new
 * unlocks into useAchievementStore (which AchievementToast then displays).
 */
import { useEffect } from "react";
import { useNormieStore } from "@/store/useNormieStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useQuestStore } from "@/store/useQuestStore";
import { useGameStore } from "@/store/useGameStore";
import { useAchievementStore } from "@/store/useAchievementStore";
import { parsePixels } from "@/systems/normie/PixelAnalyzer";
import { computeUnlocked, type AchievementContext } from "@/systems/progression/AchievementSystem";
import { NORMIE_PIXEL_COUNT } from "@/api/types";

export default function AchievementWatcher() {
  const avatar = usePlayerStore((s) => s.avatar);
  const realityCores = usePlayerStore((s) => s.realityCores);
  const canvas = useNormieStore((s) => s.canvas);
  const pixels = useNormieStore((s) => s.pixels);
  const quests = useQuestStore((s) => s.quests);
  const bossDefeated = useGameStore((s) => s.boss.defeated);
  const unlockMany = useAchievementStore((s) => s.unlockMany);

  useEffect(() => {
    const pixelDensity = pixels && pixels.length === NORMIE_PIXEL_COUNT ? parsePixels(pixels).density : null;
    const ctx: AchievementContext = {
      avatarReady: avatar !== null,
      canvasLevel: canvas?.level ?? null,
      actionPoints: canvas?.actionPoints ?? null,
      customized: canvas?.customized ?? false,
      pixelDensity,
      realityCores,
      questObjectiveDone: quests.some((q) => q.objectives.some((o) => o.done)),
      bossDefeated,
    };
    unlockMany(computeUnlocked(ctx));
  }, [avatar, canvas, pixels, quests, realityCores, bossDefeated, unlockMany]);

  return null;
}
