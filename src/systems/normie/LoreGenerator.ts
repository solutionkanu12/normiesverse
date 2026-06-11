/**
 * LoreGenerator — turns a Normie's transform history (`/history/normie/{id}/
 * versions`) and traits into story chapters (per CLAUDE.md: "each pixel-change
 * version into a story chapter").
 *
 * Every chapter is grounded in real API data: the origin chapter reads from
 * the live traits; each subsequent chapter corresponds to one on-chain
 * transform version. A Normie that was never modified yields a single
 * "pristine timeline" chapter — which is itself a true fact about its data.
 */
import type { NormieTraits, NormieVersion } from "@/api/types";

export interface LoreChapter {
  /** Chapter heading. */
  title: string;
  /** Narrative body. */
  body: string;
  /** Optional date label (from the version timestamp). */
  date?: string;
}

/** Cap chapters so the panel stays readable. */
const MAX_VERSION_CHAPTERS = 6;

function formatTimestamp(ts?: number): string | undefined {
  if (!ts || !Number.isFinite(ts)) return undefined;
  // Accept seconds or milliseconds.
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Origin chapter woven from the live traits. */
function originChapter(id: number, traits: NormieTraits): LoreChapter {
  const t = traits.type || "Normie";
  const age = traits.age ? traits.age.toLowerCase() : "ageless";
  const expr = traits.expression || "unreadable";
  const acc = traits.accessory && traits.accessory.toLowerCase() !== "none" ? traits.accessory : null;

  const body =
    `Normie #${id} entered the chain as ${article(t)} ${t}, ${age}, wearing ${article(expr)} ` +
    `${expr.toLowerCase()} expression${acc ? ` and a ${acc.toLowerCase()}` : ""}. ` +
    `When the realities began to collapse, this signature is what the Nexus latched onto — ` +
    `the seed from which this universe was rebuilt.`;

  return { title: "Origin", body };
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

/**
 * Build the full lore arc. `versions` are the on-chain transform records,
 * newest-or-oldest order is preserved as returned by the API but presented as
 * sequential chapters.
 */
export function generateLore(
  id: number,
  traits: NormieTraits,
  versions: NormieVersion[] | null,
): LoreChapter[] {
  const chapters: LoreChapter[] = [originChapter(id, traits)];

  if (!versions || versions.length === 0) {
    chapters.push({
      title: "A Pristine Timeline",
      body:
        `No transform versions are recorded for Normie #${id}. Its form never wavered across the ` +
        `Canvas era — a fixed point while other realities fractured. That stability is why it can ` +
        `anchor a world at all.`,
    });
    return chapters;
  }

  // Oldest → newest, capped.
  const ordered = [...versions].sort((a, b) => (a.version ?? 0) - (b.version ?? 0));
  const shown = ordered.slice(0, MAX_VERSION_CHAPTERS);

  shown.forEach((v, i) => {
    const n = v.version ?? i + 1;
    chapters.push({
      title: `Transform ${String(n).padStart(2, "0")}`,
      date: formatTimestamp(v.timestamp),
      body:
        `Version ${n}: the bitmap was rewritten. Pixels shifted, and with them a fragment of this ` +
        `reality re-formed. Survivors of the collapse remember it as ${ORDINAL[Math.min(i, ORDINAL.length - 1)]} ` +
        `fracture — proof the Normie was being shaped by hands beyond the chain.`,
    });
  });

  const remaining = ordered.length - shown.length;
  if (remaining > 0) {
    chapters.push({
      title: "Lost Pages",
      body:
        `${remaining} further transform${remaining === 1 ? "" : "s"} are recorded but their chapters ` +
        `are scattered across the void, awaiting recovery.`,
    });
  }

  return chapters;
}

const ORDINAL = ["the first", "the second", "the third", "the fourth", "the fifth", "the sixth"];
