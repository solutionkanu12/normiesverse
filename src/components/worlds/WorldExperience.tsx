"use client";

/**
 * WorldExperience — top-level client orchestration for a generated universe.
 *
 *   - Builds the WorldConfig from the selected Normie (traits + pixels +
 *     canvas) via the WorldFactory — every world property is data-derived.
 *   - Fetches on-chain transform history (/history/normie/{id}/versions) and
 *     turns it into lore chapters.
 *   - Tracks Reality Core collection (persisted to usePlayerStore).
 *   - Renders the R3F scene + the DOM HUD.
 *
 * The route page guards that a Normie is selected before mounting this.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WorldKind } from "@/store/useWorldStore";
import { useWorldStore } from "@/store/useWorldStore";
import { useNormieStore } from "@/store/useNormieStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { useQuestStore } from "@/store/useQuestStore";
import normiesApi from "@/api/normiesApi";
import { buildWorld } from "@/systems/world/WorldFactory";
import { fillTier } from "@/systems/world/BiomeCalculator";
import { generateLore, type LoreChapter } from "@/systems/normie/LoreGenerator";
import { buildWorldQuests } from "@/systems/quest/QuestFactory";
import { nextPortalAfter } from "@/systems/quest/portalGate";
import { PORTALS } from "@/components/nexus/nexusConstants";
import type { AvatarBuild } from "@/systems/normie/avatar.types";
import WorldScene from "./WorldScene";
import WorldHud from "./WorldHud";

interface WorldExperienceProps {
  kind: WorldKind;
  /** Selected Normie id — guaranteed present by the route guard. */
  normieId: number;
  build: AvatarBuild;
}

const MAIN_OBJECTIVE_ID = "recover-core";
/** Delay before the reward screen appears, after the core's absorb animation. */
const REWARD_SCREEN_DELAY_MS = 900;

export default function WorldExperience({ kind, normieId, build }: WorldExperienceProps) {
  const traits = useNormieStore((s) => s.traits)!;
  const canvas = useNormieStore((s) => s.canvas);
  const pixels = useNormieStore((s) => s.pixels)!;

  const setWorld = useWorldStore((s) => s.setWorld);
  const setReady = useWorldStore((s) => s.setReady);
  const realityCores = usePlayerStore((s) => s.realityCores);
  const addRealityCore = usePlayerStore((s) => s.addRealityCore);

  const setQuestsForWorld = useQuestStore((s) => s.setQuestsForWorld);
  const completeObjective = useQuestStore((s) => s.completeObjective);
  const openRewardScreen = useQuestStore((s) => s.openRewardScreen);
  const pushDialogue = useQuestStore((s) => s.pushDialogue);

  // Derive the world once per (kind, Normie). Pure + deterministic.
  const config = useMemo(
    () => buildWorld({ kind, pixels, traits, canvas }),
    [kind, pixels, traits, canvas],
  );

  // Register the active world (kind + seed) for downstream systems.
  useEffect(() => {
    setWorld(kind, config.seed);
    setReady(true);
    return () => setReady(false);
  }, [kind, config.seed, setWorld, setReady]);

  // ── Lore + quests (on-chain transform history + canvas/diff) ────────────────
  const [lore, setLore] = useState<LoreChapter[]>([]);
  const [loreLoading, setLoreLoading] = useState(true);
  const [loreError, setLoreError] = useState<string | null>(null);

  useEffect(() => {
    // normieId is stable for a mounted world, so the initial loading/error
    // state covers the first (and only) fetch — no synchronous reset needed.
    let cancelled = false;

    Promise.allSettled([normiesApi.getVersions(normieId), normiesApi.getCanvasDiff(normieId)]).then(
      ([versionsResult, diffResult]) => {
        if (cancelled) return;

        const versions = versionsResult.status === "fulfilled" ? versionsResult.value : null;
        const diff = diffResult.status === "fulfilled" ? diffResult.value : null;

        setLore(generateLore(normieId, traits, versions));
        if (versionsResult.status === "rejected") {
          const msg =
            versionsResult.reason instanceof Error ? versionsResult.reason.message : String(versionsResult.reason);
          // History may 404 for never-modified Normies — that's an expected "pristine timeline".
          if (!/404/.test(msg)) setLoreError(msg);
        }
        setLoreLoading(false);

        const quests = buildWorldQuests({
          normieId,
          traits,
          canvas,
          diff,
          versionCount: versions?.length ?? 0,
          config,
        });
        setQuestsForWorld(kind, quests);

        const mainQuest = quests.find((q) => q.kind === "main");
        if (mainQuest) {
          pushDialogue({ questId: mainQuest.id, title: mainQuest.title, text: mainQuest.dialogue });
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [normieId, traits, canvas, config, kind, setQuestsForWorld, pushDialogue]);

  // ── Reality Core collection ──────────────────────────────────────────────
  const alreadyHad = realityCores.includes(config.coreId);
  const [coreCollected, setCoreCollected] = useState(alreadyHad);
  const [justCollected, setJustCollected] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const rewardTimer = useRef<number | null>(null);

  const handleCollectCore = useCallback(() => {
    setCoreCollected(true);
    setJustCollected(true);
    addRealityCore(config.coreId);
    completeObjective(`${kind}-main`, MAIN_OBJECTIVE_ID);

    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setJustCollected(false), 3200);

    if (rewardTimer.current) window.clearTimeout(rewardTimer.current);
    rewardTimer.current = window.setTimeout(() => {
      const mainQuest = useQuestStore.getState().quests.find((q) => q.id === `${kind}-main`);
      const reward = mainQuest?.reward ?? { actionPoints: 0, experience: 0 };
      const nextWorld = nextPortalAfter(kind);
      const nextWorldLabel = nextWorld ? PORTALS.find((p) => p.id === nextWorld)?.label ?? null : null;
      openRewardScreen({
        worldKind: kind,
        normieId,
        canvasLevel: config.canvasLevel,
        reward,
        coreColor: config.coreColor,
        loreExcerpt: lore[lore.length - 1]?.body,
        nextWorldLabel,
      });

      // Release the pointer lock so the player can click "Continue" right away
      // (otherwise the cursor is captured and the button is unreachable).
      if (typeof document !== "undefined") document.exitPointerLock?.();

      // Apply the reward to the player's stats — Action Points grow the energy
      // pool (cap included so the bar stays sensible), Experience accumulates.
      const ps = usePlayerStore.getState();
      ps.setStats({
        actionPoints: ps.stats.actionPoints + reward.actionPoints,
        maxActionPoints: ps.stats.maxActionPoints + reward.actionPoints,
        experience: ps.stats.experience + reward.experience,
      });
    }, REWARD_SCREEN_DELAY_MS);
  }, [addRealityCore, completeObjective, openRewardScreen, config.coreId, config.canvasLevel, config.coreColor, kind, normieId, lore]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    if (rewardTimer.current) window.clearTimeout(rewardTimer.current);
  }, []);

  // ── HUD state ──────────────────────────────────────────────────────────────
  const [locked, setLocked] = useState(false);

  return (
    <div className="relative w-full h-full">
      <WorldScene
        config={config}
        build={build}
        coreCollected={coreCollected}
        onCollectCore={handleCollectCore}
        onLockChange={setLocked}
      />

      <WorldHud
        worldKind={kind}
        label={config.label}
        accent={config.coreColor}
        normieId={normieId}
        level={config.canvasLevel}
        actionPoints={canvas?.actionPoints ?? 0}
        architecture={config.architecture}
        density={config.density}
        fillTier={fillTier(config.density)}
        enemyCount={config.enemies.count}
        hiddenAreaUnlocked={config.hiddenAreaUnlocked}
        locked={locked}
        coreCollected={coreCollected}
        justCollected={justCollected}
        lore={lore}
        loreLoading={loreLoading}
        loreError={loreError}
      />
    </div>
  );
}
