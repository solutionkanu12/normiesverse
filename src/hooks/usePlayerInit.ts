"use client";

/**
 * usePlayerInit — builds the voxel avatar + derives stats from the selected
 * Normie and saves both into usePlayerStore. Runs once per selected Normie.
 *
 * This is where the live Normies API data (pixels, traits, Canvas info) becomes
 * the player's avatar — the core rule in action.
 */
import { useEffect } from "react";
import { useNormieStore } from "@/store/useNormieStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { buildAvatar, deriveStats } from "@/systems/normie/AvatarBuilder";

export function usePlayerInit(): void {
  const id = useNormieStore((s) => s.id);
  const pixels = useNormieStore((s) => s.pixels);
  const traits = useNormieStore((s) => s.traits);
  const canvas = useNormieStore((s) => s.canvas);

  const avatar = usePlayerStore((s) => s.avatar);
  const setAvatar = usePlayerStore((s) => s.setAvatar);
  const setStats = usePlayerStore((s) => s.setStats);

  useEffect(() => {
    if (id == null || !pixels || !traits) return;
    // Already built for this Normie — don't rebuild.
    if (avatar && avatar.normieId === id) return;

    try {
      const build = buildAvatar({ id, pixels, traits, canvas });
      setAvatar(build);
      setStats(deriveStats(canvas));
    } catch (err) {
      console.error("Avatar build failed:", err);
    }
  }, [id, pixels, traits, canvas, avatar, setAvatar, setStats]);
}
