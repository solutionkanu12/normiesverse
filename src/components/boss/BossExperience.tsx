"use client";

/**
 * BossExperience — top-level client orchestration for the Null Normie fight.
 *
 *   - Derives the boss stat block from the player's Normie (Canvas Level → HP,
 *     pixel density → summon/hazard counts) via BossStatCalculator.
 *   - Starts the fight in useGameStore, restores the player to full integrity,
 *     and tears it all down on unmount.
 *   - Renders the R3F scene + the DOM HUD; on the boss's dissolve it raises the
 *     victory sequence and advances the game phase to "victory".
 *
 * The route guards that a Normie is selected and all three Reality Cores are
 * recovered before mounting this.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { parsePixels } from "@/systems/normie/PixelAnalyzer";
import { calculateBossStats } from "@/systems/combat/BossStatCalculator";
import type { AvatarBuild } from "@/systems/normie/avatar.types";
import { useNormieStore } from "@/store/useNormieStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useGameStore } from "@/store/useGameStore";
import BossScene from "./BossScene";
import BossHud from "./BossHud";
import VictorySequence from "./VictorySequence";
import { COMBAT } from "./bossConstants";

interface BossExperienceProps {
  normieId: number;
  build: AvatarBuild;
}

export default function BossExperience({ normieId, build }: BossExperienceProps) {
  const canvas = useNormieStore((s) => s.canvas);

  const startBoss = useGameStore((s) => s.startBoss);
  const resetBoss = useGameStore((s) => s.resetBoss);
  const setPhase = useGameStore((s) => s.setPhase);

  const [locked, setLocked] = useState(false);
  const [victory, setVictory] = useState(false);

  // Derive boss stats + a deterministic arena seed from the player's bitmap.
  const { stats, seed } = useMemo(() => {
    const grid = parsePixels(build.pixels);
    const s = calculateBossStats({
      canvasLevel: canvas?.level ?? 1,
      density: grid.density,
    });
    const seedVal = (((grid.onCount + 1) * 2654435761) ^ (normieId * 40503)) >>> 0;
    return { stats: s, seed: seedVal };
  }, [build.pixels, canvas?.level, normieId]);

  // Start the fight + restore the player to full integrity; tear down on exit.
  useEffect(() => {
    startBoss(stats.maxHp);
    setPhase("boss");
    const ps = usePlayerStore.getState();
    ps.setStats({ health: ps.stats.maxHealth || COMBAT.playerMaxHp });
    return () => resetBoss();
  }, [stats.maxHp, startBoss, resetBoss, setPhase]);

  // The boss finished dissolving → raise the victory sequence.
  const handleDissolved = useCallback(() => {
    setVictory(true);
    setPhase("victory");
  }, [setPhase]);

  return (
    <div className="relative w-full h-full">
      <BossScene
        build={build}
        stats={stats}
        seed={seed}
        onLockChange={setLocked}
        onDissolved={handleDissolved}
      />

      <BossHud locked={locked} normieId={normieId} />

      {victory && <VictorySequence normieId={normieId} />}
    </div>
  );
}
