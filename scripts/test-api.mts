/**
 * Phase 1 API smoke test.
 *
 * Hits the live Normies API for IDs 0, 42, 100, 5000, 9999 through our cache +
 * rate-limit layer and prints a summary. Also verifies cache hits and a 400 on
 * an out-of-range ID.
 *
 * Run with:  npx tsx scripts/test-api.mts
 */
import {
  getCanvasInfo,
  getMetadata,
  getOwner,
  getPixels,
  getTraits,
} from "../src/api/normiesApi";
import { normiesCache } from "../src/api/apiCache";
import { normiesRateLimiter } from "../src/api/rateLimiter";
import { NORMIE_PIXEL_COUNT, NormiesApiError } from "../src/api/types";

const IDS = [0, 42, 100, 5000, 9999];

function countOnes(pixels: string): number {
  let n = 0;
  for (let i = 0; i < pixels.length; i++) if (pixels[i] === "1") n++;
  return n;
}

async function testId(id: number): Promise<boolean> {
  try {
    const t0 = Date.now();
    const pixels = await getPixels(id);
    const traits = await getTraits(id);

    // Optional/diagnostic endpoints — tolerate per-endpoint failures.
    const canvas = await getCanvasInfo(id).catch((e) => e as Error);
    const owner = await getOwner(id).catch((e) => e as Error);
    const meta = await getMetadata(id).catch((e) => e as Error);
    const ms = Date.now() - t0;

    const okLen = pixels.length === NORMIE_PIXEL_COUNT;
    const onlyBits = /^[01]+$/.test(pixels);
    const ones = countOnes(pixels);

    console.log(`\n── Normie #${id} ${"─".repeat(40)}`);
    console.log(
      `  pixels   : ${pixels.length} chars ${okLen ? "✓" : "✗ (expected 1600)"}` +
        ` | bits-only ${onlyBits ? "✓" : "✗"} | density ${ones}/${NORMIE_PIXEL_COUNT}` +
        ` (${((ones / NORMIE_PIXEL_COUNT) * 100).toFixed(1)}%)`,
    );
    console.log(
      `  traits   : Type=${traits.type} Gender=${traits.gender} Age=${traits.age}` +
        ` Eyes=${traits.eyes || "—"} Expr=${traits.expression || "—"}` +
        ` Acc=${traits.accessory || "—"}`,
    );
    if (canvas instanceof Error) console.log(`  canvas   : (unavailable: ${canvas.message})`);
    else console.log(`  canvas   : Level=${canvas.level ?? "?"} AP=${canvas.actionPoints ?? "?"} customized=${canvas.customized ?? "?"}`);
    if (owner instanceof Error) console.log(`  owner    : (unavailable: ${owner.message})`);
    else console.log(`  owner    : ${owner.owner ?? "?"}`);
    if (meta instanceof Error) console.log(`  metadata : (unavailable: ${meta.message})`);
    else console.log(`  metadata : name=${meta.name ?? "?"} attrs=${meta.attributes?.length ?? 0}`);
    console.log(`  fetched in ${ms}ms`);

    return okLen && onlyBits;
  } catch (err) {
    const e = err as Error;
    console.log(`\n── Normie #${id} ─ FAILED: ${e.message}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log("NormiesVerse — Phase 1 API smoke test");
  console.log(`Testing IDs: ${IDS.join(", ")}`);

  const results: boolean[] = [];
  for (const id of IDS) results.push(await testId(id));

  // Cache verification: second pixel fetch should be instant and not consume budget.
  console.log(`\n── Cache + rate-limit checks ${"─".repeat(28)}`);
  const beforeRemaining = normiesRateLimiter.remaining();
  const tCache0 = Date.now();
  await getPixels(0);
  const cacheMs = Date.now() - tCache0;
  const afterRemaining = normiesRateLimiter.remaining();
  const cacheHit = cacheMs < 5 && afterRemaining === beforeRemaining;
  console.log(`  cache hit on #0 re-fetch : ${cacheHit ? "✓" : "✗"} (${cacheMs}ms, budget unchanged: ${afterRemaining === beforeRemaining})`);
  console.log(`  cache entries            : ${normiesCache.size}`);
  console.log(`  rate-limit budget left   : ${normiesRateLimiter.remaining()}/60 this window`);

  // Validation check: out-of-range ID should throw a 400 NormiesApiError without a network call.
  let validation = false;
  try {
    await getPixels(10000);
  } catch (e: unknown) {
    validation = e instanceof NormiesApiError && e.status === 400;
  }
  console.log(`  rejects ID 10000 (400)   : ${validation ? "✓" : "✗"}`);

  const passed = results.filter(Boolean).length;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`RESULT: ${passed}/${IDS.length} Normies OK | cache ${cacheHit ? "OK" : "FAIL"} | validation ${validation ? "OK" : "FAIL"}`);
  const allGood = passed === IDS.length && cacheHit && validation;
  console.log(allGood ? "✅ Phase 1 API layer verified." : "⚠️  Some checks failed — see above.");
  process.exit(allGood ? 0 : 1);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
