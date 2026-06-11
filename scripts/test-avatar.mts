/**
 * Phase 4 avatar-pipeline test (no browser).
 *
 * Fetches real pixels/traits/canvas for several Normies and runs the pure
 * avatar logic — PixelAnalyzer segmentation + AvatarBuilder material/aura/stats
 * — asserting the output is sane. Rendering itself is verified in the browser.
 *
 * Run:  npx tsx scripts/test-avatar.mts
 */
import { getCanvasInfo, getPixels, getTraits } from "../src/api/normiesApi";
import { analyzePixels, segmentForRow } from "../src/systems/normie/PixelAnalyzer";
import { buildAvatar, deriveStats } from "../src/systems/normie/AvatarBuilder";

const IDS = [0, 42, 100, 5000, 9999];

function assert(cond: boolean, msg: string): boolean {
  if (!cond) console.log(`    ✗ ${msg}`);
  return cond;
}

async function main() {
  console.log("NormiesVerse — Phase 4 avatar pipeline test\n");

  // Static check: row → segment mapping covers all 40 rows with no gap.
  const segCounts: Record<string, number> = {};
  for (let r = 0; r < 40; r++) segCounts[segmentForRow(r)] = (segCounts[segmentForRow(r)] ?? 0) + 1;
  console.log("Row segmentation (rows per part):", segCounts);
  let ok =
    segCounts.head === 8 &&
    segCounts.shoulders === 4 &&
    segCounts.torso === 16 &&
    segCounts.legs === 12;
  console.log(ok ? "  ✓ 8/4/16/12 rows → head/shoulders/torso/legs\n" : "  ✗ segmentation wrong\n");

  for (const id of IDS) {
    const [pixels, traits, canvas] = await Promise.all([
      getPixels(id),
      getTraits(id),
      getCanvasInfo(id).catch(() => null),
    ]);

    const geo = analyzePixels(pixels);
    const seg = geo.segments;
    const total =
      seg.head.length +
      seg.shoulders.length +
      seg.torso.length +
      seg.legsLeft.length +
      seg.legsRight.length;

    const build = buildAvatar({ id, pixels, traits, canvas });
    const stats = deriveStats(canvas);

    console.log(`── Normie #${id} (${traits.type}) ${"─".repeat(30)}`);
    console.log(
      `  voxels: head=${seg.head.length} shoulders=${seg.shoulders.length}` +
        ` torso=${seg.torso.length} legsL=${seg.legsLeft.length} legsR=${seg.legsRight.length}` +
        ` | total=${total}`,
    );
    console.log(
      `  density=${(geo.grid.density * 100).toFixed(1)}% | material=${build.material.kind}` +
        ` | aura=${build.auraIntensity.toFixed(2)} | accent=${build.accent}`,
    );
    console.log(
      `  stats: level=${stats.level} AP=${stats.actionPoints} health=${stats.health}/${stats.maxHealth}`,
    );

    // Assertions
    let pass = true;
    pass = assert(total === geo.grid.onCount, "voxel total == on-pixel count") && pass;
    pass = assert(total > 0, "avatar has voxels") && pass;
    pass = assert(
      build.material.kind ===
        ({ Human: "matte", Cat: "fur", Alien: "emissive", Agent: "reflective" } as const)[traits.type],
      `material matches type ${traits.type}`,
    ) && pass;
    pass = assert(build.auraIntensity >= 0.2 && build.auraIntensity <= 2.3, "aura in range") && pass;
    pass = assert(stats.maxHealth! >= 100, "health >= 100") && pass;
    console.log(pass ? "  ✓ all checks passed\n" : "  ✗ some checks failed\n");
    ok = ok && pass;
  }

  console.log("═".repeat(56));
  console.log(ok ? "✅ Phase 4 avatar pipeline verified." : "⚠️  Some checks failed.");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
