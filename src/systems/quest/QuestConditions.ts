/**
 * QuestConditions — derives the per-world side quest's mission type from the
 * selected Normie's traits, per CLAUDE.md's mandatory combo rules:
 *
 *   Agent + Old              → stealth mission
 *   Human + Angry expression → combat mission
 *   Cat + Happy expression   → exploration mission
 *   Alien + Glasses accessory → puzzle mission
 *
 * Normies that don't match a mandatory combo still need a mission, so
 * Expression- and Type-based fallbacks fill the gaps — every Normie yields
 * exactly one mission type.
 */
import type { NormieTraits } from "@/api/types";
import type { MissionType } from "./questTypes";

/** Mandatory trait-combo rules (CLAUDE.md) with Expression/Type fallbacks. */
export function deriveMissionType(traits: NormieTraits): MissionType {
  const type = traits.type;
  const age = (traits.age || "").toLowerCase();
  const expr = (traits.expression || "").toLowerCase();
  const accessory = (traits.accessory || "").toLowerCase();

  // 1. Mandatory combos.
  if (type === "Agent" && age === "old") return "stealth";
  if (type === "Human" && /angr/.test(expr)) return "combat";
  if (type === "Cat" && /happ/.test(expr)) return "exploration";
  if (type === "Alien" && /glass/.test(accessory)) return "puzzle";

  // 2. Expression-driven fallback.
  if (/angr|serious|grim|mad|stern|smirk|frown/.test(expr)) return "combat";
  if (/happ|joy|smil|grin/.test(expr)) return "exploration";
  if (/calm|neutral|bored|relax/.test(expr)) return "puzzle";
  if (/surpr|shock|scared|fear/.test(expr)) return "stealth";

  // 3. Type-driven final fallback (mirrors the mandatory combos' types).
  switch (type) {
    case "Agent":
      return "stealth";
    case "Human":
      return "combat";
    case "Cat":
      return "exploration";
    case "Alien":
    default:
      return "puzzle";
  }
}

export interface MissionMeta {
  title: string;
  description: string;
  dialogue: string;
  /** Proximity radius (units) for this mission's objective targets. */
  radius: number;
}

/** Per-mission-type flavor, woven from the Normie's own traits + world label. */
export const MISSION_META: Record<MissionType, (traits: NormieTraits, worldLabel: string) => MissionMeta> = {
  stealth: (traits, worldLabel) => ({
    title: "Silent Passage",
    description: `Slip past the ${worldLabel} watchers and reach the hidden relays undetected.`,
    dialogue:
      `An old hand recognizes old patterns. The ${traits.type} in you remembers a hundred quiet ` +
      `extractions — this is one more. Reach the relays. Don't be seen.`,
    radius: 6,
  }),
  combat: (traits, worldLabel) => ({
    title: "Clear the Line",
    description: `Engage the hostiles holding the ${worldLabel} approach.`,
    dialogue:
      `There's no negotiating with what's left of this reality. Whatever put that ` +
      `${traits.expression.toLowerCase() || "look"} on your face — point it at the hostiles ` +
      `blocking the way and clear a path.`,
    radius: 5,
  }),
  exploration: (traits, worldLabel) => ({
    title: "Chart the Reaches",
    description: `Scout the high points of the ${worldLabel} and map what's still standing.`,
    dialogue:
      `Curiosity is its own kind of survival. Climb to the marked points and see what the ` +
      `collapse left behind — every vantage is one less unknown.`,
    radius: 5,
  }),
  puzzle: (traits, worldLabel) => ({
    title: "Read the Pattern",
    description: `Trace the Canvas-altered region of the ${worldLabel} and decode what changed.`,
    dialogue:
      `Something here doesn't match the ${traits.type}'s original pattern. Follow the ` +
      `discrepancy — whatever was changed wasn't changed by accident.`,
    radius: 6,
  }),
};
