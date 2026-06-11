/**
 * QuestFactory — builds the three quests for one generated world from live
 * Normie API data (per CLAUDE.md Phase 8):
 *
 *   - Main quest:   recover the Reality Core (completed externally on pickup).
 *   - Side quest:   trait-combo-driven mission (QuestConditions.deriveMissionType).
 *   - Secret quest: "Canvas Echo" — unlocked by canvas/diff (customization).
 *
 * Objectives are uniform "reach target(s) within radius" — targets are drawn
 * from the same WorldConfig data the world itself is built from (placements,
 * enemy spawns, hidden area, canvas/diff pixels), so quest markers always line
 * up with what's actually in the world.
 */
import { NORMIE_GRID_SIZE } from "@/api/types";
import type { CanvasDiff, CanvasInfo, NormieTraits } from "@/api/types";
import type { PlacedObject, Vec3, WorldConfig } from "@/systems/world/worldTypes";
import { seedEnemies } from "@/systems/world/EnvironmentSeeder";
import { CORE_COLLECT_RADIUS, DEFAULT_ENEMY_BASE_Y, ENEMY_BASE_Y } from "@/components/worlds/worldConstants";
import { deriveMissionType, MISSION_META } from "./QuestConditions";
import { calculateReward } from "./RewardCalculator";
import type { Quest, QuestObjective } from "./questTypes";

const MAIN_OBJECTIVE_ID = "recover-core";

function objective(
  id: string,
  description: string,
  targets: Vec3[],
  radius: number,
  targetCount: number,
): QuestObjective {
  return {
    id,
    description,
    targets,
    radius,
    targetCount: Math.max(1, Math.min(targetCount, targets.length)),
    consumedTargets: [],
    done: false,
  };
}

// ---------------------------------------------------------------------------
// Main quest — find and collect the Reality Core
// ---------------------------------------------------------------------------

function buildMainQuest(
  config: WorldConfig,
  normieId: number,
  canvas: CanvasInfo | null,
  versionCount: number,
): Quest {
  return {
    id: `${config.kind}-main`,
    worldKind: config.kind,
    kind: "main",
    title: "Recover the Reality Core",
    description: `${config.label} is collapsing. Find and recover its Reality Core before the fracture spreads.`,
    dialogue:
      `Normie #${normieId}, this reality is unraveling. Somewhere within ${config.label.toLowerCase()} a ` +
      `Reality Core still holds — find it before the collapse reaches it. Everything else here was built ` +
      `from your own signature; the Core is the last piece that's still whole.`,
    status: "active",
    objectives: [
      objective(MAIN_OBJECTIVE_ID, `Locate the Reality Core within ${config.label}.`, [config.corePosition], CORE_COLLECT_RADIUS, 1),
    ],
    reward: calculateReward({ kind: "main", canvas, versionCount }),
  };
}

// ---------------------------------------------------------------------------
// Side quest — trait-specific mission
// ---------------------------------------------------------------------------

function topPlacements(placements: PlacedObject[], n: number): PlacedObject[] {
  return [...placements].sort((a, b) => b.weight - a.weight).slice(0, n);
}

/** Lift a placement into a reachable point above its structure/platform. */
function placementTarget(p: PlacedObject): Vec3 {
  return [p.x, p.y + 1.6, p.z];
}

/** Far corner of the world — used as a stealth target when the hidden area isn't unlocked yet. */
function farCorner(config: WorldConfig): Vec3 {
  return [config.extent * 0.85, config.hiddenAreaPosition[1], -config.extent * 0.85];
}

function buildSideQuest(
  config: WorldConfig,
  traits: NormieTraits,
  normieId: number,
  canvas: CanvasInfo | null,
  diff: CanvasDiff | null,
  versionCount: number,
): Quest {
  const missionType = deriveMissionType(traits);
  const meta = MISSION_META[missionType](traits, config.label);

  let targets: Vec3[];
  switch (missionType) {
    case "exploration": {
      const top = topPlacements(config.placements, Math.min(3, config.placements.length));
      targets = top.length > 0 ? top.map(placementTarget) : [config.hiddenAreaPosition];
      break;
    }
    case "combat": {
      const baseY = ENEMY_BASE_Y[config.kind] ?? DEFAULT_ENEMY_BASE_Y;
      const enemies = seedEnemies(config.seed, config.enemies.count, config.extent, baseY);
      const picks = enemies.slice(0, Math.min(3, enemies.length));
      targets = picks.length > 0 ? picks.map((e) => e.home) : [config.hiddenAreaPosition];
      break;
    }
    case "stealth": {
      targets = [config.hiddenAreaUnlocked ? config.hiddenAreaPosition : farCorner(config)];
      break;
    }
    case "puzzle":
    default: {
      const target = diffTargetPosition(diff, config, 0);
      targets = [target ?? config.hiddenAreaPosition];
      break;
    }
  }

  return {
    id: `${config.kind}-side`,
    worldKind: config.kind,
    kind: "side",
    missionType,
    title: meta.title,
    description: meta.description,
    dialogue: meta.dialogue,
    status: "active",
    objectives: [
      objective(`${config.kind}-side-objective`, meta.description, targets, meta.radius, targets.length),
    ],
    reward: calculateReward({ kind: "side", canvas, versionCount }),
  };
}

// ---------------------------------------------------------------------------
// Secret quest — "Canvas Echo", triggered by canvas/diff data
// ---------------------------------------------------------------------------

/**
 * Map a changed-pixel index (from canvas/diff) to a world position: locate
 * its coarse-grid cell (using the same coarseN the world's placements were
 * seeded with) and target the nearest placement.
 */
function diffTargetPosition(diff: CanvasDiff | null, config: WorldConfig, pickIndex: number): Vec3 | null {
  const changed = diff?.changedPixels;
  if (!changed || changed.length === 0) return null;

  const idx = changed[pickIndex % changed.length];
  const row = Math.floor(idx / NORMIE_GRID_SIZE);
  const col = idx % NORMIE_GRID_SIZE;
  const block = NORMIE_GRID_SIZE / config.coarseN;
  const gx = Math.floor(col / block);
  const gy = Math.floor(row / block);

  let best: PlacedObject | null = null;
  let bestDist = Infinity;
  for (const p of config.placements) {
    const d = Math.hypot(p.gx - gx, p.gy - gy);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  if (!best) return null;
  return [best.x, best.y + 1.6, best.z];
}

function buildSecretQuest(
  config: WorldConfig,
  normieId: number,
  canvas: CanvasInfo | null,
  diff: CanvasDiff | null,
  versionCount: number,
): Quest {
  const changed = diff?.changedPixels ?? [];
  const customized = canvas?.customized ?? false;
  const unlocked = customized || changed.length > 0;
  const reward = calculateReward({ kind: "secret", canvas, versionCount });

  if (!unlocked) {
    return {
      id: `${config.kind}-secret`,
      worldKind: config.kind,
      kind: "secret",
      title: "Canvas Echo",
      description: "A discrepancy in this Normie's Canvas record — undetected so far.",
      dialogue:
        `Normie #${normieId}'s Canvas record shows no edits. If an echo exists in ${config.label}, it ` +
        `hasn't surfaced yet — keep moving and watch for anything that doesn't belong.`,
      status: "locked",
      objectives: [],
      reward,
    };
  }

  // Use a different changed-pixel candidate than the puzzle quest (when both are
  // diff-driven) so the two objectives don't collapse onto the same point.
  const pickIndex = changed.length > 1 ? Math.floor(changed.length / 2) : 0;
  const base = diffTargetPosition(diff, config, pickIndex) ?? config.hiddenAreaPosition;
  const target: Vec3 = [base[0] + 2, base[1] + 0.6, base[2] + 2];

  return {
    id: `${config.kind}-secret`,
    worldKind: config.kind,
    kind: "secret",
    title: "Canvas Echo",
    description: `Trace the Canvas anomaly hidden within ${config.label}.`,
    dialogue:
      `Normie #${normieId} was touched by the Canvas — ${changed.length} pixel${changed.length === 1 ? "" : "s"} ` +
      `rewritten since the original. That change left an echo somewhere in this reality. Find it.`,
    status: "active",
    objectives: [
      objective(`${config.kind}-secret-objective`, `Find the Canvas Echo within ${config.label}.`, [target], 6, 1),
    ],
    reward,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BuildWorldQuestsParams {
  normieId: number;
  traits: NormieTraits;
  canvas: CanvasInfo | null;
  diff: CanvasDiff | null;
  versionCount: number;
  config: WorldConfig;
}

/** Build [main, side, secret] quests for one world. */
export function buildWorldQuests({ normieId, traits, canvas, diff, versionCount, config }: BuildWorldQuestsParams): Quest[] {
  return [
    buildMainQuest(config, normieId, canvas, versionCount),
    buildSideQuest(config, traits, normieId, canvas, diff, versionCount),
    buildSecretQuest(config, normieId, canvas, diff, versionCount),
  ];
}
