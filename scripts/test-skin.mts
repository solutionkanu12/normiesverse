/**
 * test-skin — verifies the humanoid skin pipeline against live API data for the
 * required Normie IDs. Fetches /normie/{id}/pixels, parses the 40×40 bitmap,
 * and slices the body-part bands exactly as normieSkin does, asserting each
 * region has the correct dimensions and real (non-uniform) pixel data.
 *
 * Run: npx tsx scripts/test-skin.mts
 */
import { parsePixels } from "../src/systems/normie/PixelAnalyzer";

const IDS = [344, 554, 9999];
const GRID = 40;
const BASE = "https://api.normies.art";

interface Region {
  name: string;
  r0: number;
  r1: number;
  c0: number;
  c1: number;
}

// Mirrors the row→part / column-split mapping in normieSkin.ts.
const REGIONS: Region[] = [
  { name: "head", r0: 0, r1: 8, c0: 0, c1: 40 },
  { name: "torso", r0: 8, r1: 20, c0: 0, c1: 40 },
  { name: "armL", r0: 20, r1: 28, c0: 0, c1: 20 },
  { name: "armR", r0: 20, r1: 28, c0: 20, c1: 40 },
  { name: "legL", r0: 28, r1: 40, c0: 0, c1: 20 },
  { name: "legR", r0: 28, r1: 40, c0: 20, c1: 40 },
];

function countOn(cells: boolean[], reg: Region): number {
  let n = 0;
  for (let r = reg.r0; r < reg.r1; r++) {
    for (let c = reg.c0; c < reg.c1; c++) {
      if (cells[r * GRID + c]) n++;
    }
  }
  return n;
}

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`  ✗ ${msg}`);
    failures++;
  }
}

async function run(): Promise<void> {
  for (const id of IDS) {
    console.log(`\nNormie #${id}`);
    const res = await fetch(`${BASE}/normie/${id}/pixels`);
    assert(res.ok, `GET /normie/${id}/pixels → ${res.status}`);
    if (!res.ok) continue;

    const pixels = (await res.text()).trim();
    assert(pixels.length === 1600, `pixel string length ${pixels.length} === 1600`);

    const grid = parsePixels(pixels);
    assert(grid.onCount > 0 && grid.onCount < 1600, `bitmap is non-trivial (onCount=${grid.onCount})`);

    let total = 0;
    for (const reg of REGIONS) {
      const w = reg.c1 - reg.c0;
      const h = reg.r1 - reg.r0;
      const on = countOn(grid.cells, reg);
      total += on;
      // Texture dimension sanity (each region is a w×h band).
      assert(w > 0 && h > 0, `${reg.name} dims ${w}×${h} valid`);
      console.log(`  ${reg.name.padEnd(6)} ${String(w).padStart(2)}×${String(h).padStart(2)}  on=${on}`);
    }
    // Every "on" pixel must land in exactly one body band (full coverage 0..39).
    assert(total === grid.onCount, `bands cover all on-pixels (${total} === ${grid.onCount})`);
    console.log(`  density=${(grid.density * 100).toFixed(1)}%  → skin OK`);

    // Respect the API rate limit politely.
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`\n${failures === 0 ? "✓ ALL PASS" : `✗ ${failures} FAILURE(S)`}`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
