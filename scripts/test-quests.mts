/**
 * Phase 8 quest-system test (no browser).
 *
 * Fetches real pixels/traits/canvas/canvas-diff/version-history for several
 * Normies, builds a WorldConfig for each world kind via WorldFactory, then
 * runs QuestFactory.buildWorldQuests against that live data — asserting the
 * main/side/secret quests, rewards, and portal-gate logic are all sane.
 *
 * Run:  npx tsx scripts/test-quests.mts
 */
import { getCanvasDiff, getCanvasInfo, getPixels, getTraits, getVersions } from "../src/api/normiesApi";
import { buildWorld, CORE_ID } from "../src/systems/world/WorldFactory";
import { buildWorldQuests } from "../src/systems/quest/QuestFactory";
import { deriveMissionType } from "../src/systems/quest/QuestConditions";
import { isPortalUnlocked, nextPortalAfter, PORTAL_ORDER, previousPortal } from "../src/systems/quest/portalGate";
import { useQuestStore } from "../src/store/useQuestStore";
import type { WorldKind } from "../src/store/useWorldStore";
import type { CanvasDiff, CanvasInfo, NormieVersion } from "../src/api/types";

const IDS = [344, 554, 9999];
const WORLD_KINDS: WorldKind[] = ["cyberpunk", "frozen", "void"];

function assert(cond: boolean, msg: string): boolean {
  if (!cond) console.log(`    ✗ ${msg}`);
  return cond;
}

function vecEqual(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function main() {
  console.log("NormiesVerse — Phase 8 quest system test\n");
  let ok = true;

  // ── Portal gate logic (data-independent) ───────────────────────────────
  console.log("── Portal gate ──────────────────────────────");
  ok = assert(PORTAL_ORDER[0] === "cyberpunk" && PORTAL_ORDER[2] === "void", "PORTAL_ORDER is cyberpunk→frozen→void") && ok;
  ok = assert(isPortalUnlocked("cyberpunk", []), "cyberpunk portal always unlocked") && ok;
  ok = assert(!isPortalUnlocked("frozen", []), "frozen portal locked with no cores") && ok;
  ok = assert(isPortalUnlocked("frozen", [CORE_ID.cyberpunk]), "frozen portal unlocks after cyberpunk core") && ok;
  ok = assert(!isPortalUnlocked("void", [CORE_ID.cyberpunk]), "void portal still locked without frozen core") && ok;
  ok = assert(nextPortalAfter("cyberpunk") === "frozen" && nextPortalAfter("void") === null, "nextPortalAfter chains correctly") && ok;
  ok = assert(previousPortal("cyberpunk") === null && previousPortal("void") === "frozen", "previousPortal chains correctly") && ok;
  console.log(ok ? "  ✓ portal gate checks passed\n" : "  ✗ portal gate checks failed\n");

  for (const id of IDS) {
    const [pixels, traits] = await Promise.all([getPixels(id), getTraits(id)]);
    const canvas: CanvasInfo | null = await getCanvasInfo(id).catch(() => null);
    const diff: CanvasDiff | null = await getCanvasDiff(id).catch(() => null);
    const versions: NormieVersion[] | null = await getVersions(id).catch(() => null);
    const versionCount = versions?.length ?? 0;

    console.log(`── Normie #${id} (${traits.type}, ${traits.expression || "—"}) ${"─".repeat(20)}`);
    console.log(
      `  canvas: level=${canvas?.level ?? "—"} AP=${canvas?.actionPoints ?? "—"} customized=${canvas?.customized ?? "—"}` +
        ` | diff changedPixels=${diff?.changedPixels?.length ?? 0} | versions=${versionCount}`,
    );

    const expectedMission = deriveMissionType(traits);
    console.log(`  expected side mission: ${expectedMission}`);

    let pass = true;
    for (const kind of WORLD_KINDS) {
      const config = buildWorld({ kind, pixels, traits, canvas });
      const quests = buildWorldQuests({ normieId: id, traits, canvas, diff, versionCount, config });

      pass = assert(quests.length === 3, `${kind}: builds 3 quests`) && pass;

      const main = quests.find((q) => q.kind === "main");
      const side = quests.find((q) => q.kind === "side");
      const secret = quests.find((q) => q.kind === "secret");

      pass = assert(!!main && main.id === `${kind}-main`, `${kind}: main quest id`) && pass;
      pass =
        assert(
          !!main && main.objectives.length === 1 && vecEqual(main.objectives[0].targets[0], config.corePosition),
          `${kind}: main objective targets the Reality Core position`,
        ) && pass;
      pass = assert(!!main && main.reward.actionPoints > 0 && main.reward.experience > 0, `${kind}: main reward is positive`) && pass;

      pass = assert(!!side && side.missionType === expectedMission, `${kind}: side mission matches trait combo (${expectedMission})`) && pass;
      pass =
        assert(
          !!side && side.objectives.length === 1 && side.objectives[0].targets.length >= side.objectives[0].targetCount && side.objectives[0].targetCount >= 1,
          `${kind}: side objective has reachable targets`,
        ) && pass;

      const customized = canvas?.customized ?? false;
      const hasDiff = (diff?.changedPixels?.length ?? 0) > 0;
      const expectSecretActive = customized || hasDiff;
      pass =
        assert(
          !!secret && secret.status === (expectSecretActive ? "active" : "locked"),
          `${kind}: secret quest ${expectSecretActive ? "active" : "locked"} (customized=${customized}, hasDiff=${hasDiff})`,
        ) && pass;
      pass =
        assert(
          !!secret && secret.objectives.length === (expectSecretActive ? 1 : 0),
          `${kind}: secret quest objective count matches lock state`,
        ) && pass;

      // ── useQuestStore wiring: register, complete main, progress side ──
      useQuestStore.getState().reset();
      useQuestStore.getState().setQuestsForWorld(kind, quests);
      useQuestStore.getState().completeObjective(`${kind}-main`, "recover-core");
      let stored = useQuestStore.getState().quests.find((q) => q.id === `${kind}-main`)!;
      pass = assert(stored.status === "completed" && stored.objectives[0].done, `${kind}: completeObjective marks main quest completed`) && pass;

      if (side && side.status === "active") {
        useQuestStore.getState().incrementObjectiveProgress(side.id, side.objectives[0].id, 0);
        stored = useQuestStore.getState().quests.find((q) => q.id === side.id)!;
        pass = assert(stored.objectives[0].consumedTargets.includes(0), `${kind}: incrementObjectiveProgress records target 0`) && pass;
      }
    }

    console.log(pass ? "  ✓ all checks passed\n" : "  ✗ some checks failed\n");
    ok = ok && pass;
  }

  console.log("═".repeat(56));
  console.log(ok ? "✅ Phase 8 quest system verified." : "⚠️  Some checks failed.");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
