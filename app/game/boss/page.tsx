"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { CORE_ID } from "@/systems/world/WorldFactory";
import { useNormieStore } from "@/store/useNormieStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { usePlayerInit } from "@/hooks/usePlayerInit";
import LoadingScreen from "@/components/ui/LoadingScreen";

// Three.js is client-only — load the boss arena without SSR.
const BossExperience = dynamic(() => import("@/components/boss/BossExperience"), {
  ssr: false,
  loading: () => <BossLoader />,
});

/** All three Reality Cores must be recovered to confront the Null Normie. */
const ALL_CORES = Object.values(CORE_ID);

/**
 * Boss route — the Null Normie fight (Phase 9). Reachable only with a selected
 * Normie (the avatar + the corruption are both built from its pixels) and all
 * three Reality Cores recovered.
 */
export default function BossPage() {
  // Ensure the voxel avatar + stats are built from the selected Normie.
  usePlayerInit();

  const normieId = useNormieStore((s) => s.id);
  const pixels = useNormieStore((s) => s.pixels);
  const traits = useNormieStore((s) => s.traits);
  const avatar = usePlayerStore((s) => s.avatar);
  const realityCores = usePlayerStore((s) => s.realityCores);

  // No Normie selected — neither the Walker nor the Null can exist.
  if (normieId === null || !pixels || !traits) {
    return (
      <Fallback>
        <p className="text-white/40 text-sm mb-4">No Normie selected — there is no Walker to face the Null.</p>
        <Link href="/select" className="text-[#4fc3f7] hover:text-[#4fc3f7]/70 text-sm transition-colors">
          ← Choose your Normie
        </Link>
      </Fallback>
    );
  }

  // The Rift only opens once every reality has been recovered.
  const allCores = ALL_CORES.every((id) => realityCores.includes(id));
  if (!allCores) {
    return (
      <Fallback>
        <p className="text-white/40 text-sm mb-2">The Null Rift is sealed.</p>
        <p className="text-white/30 text-xs mb-4">
          Recover all three Reality Cores ({realityCores.length}/3) before confronting the Null Normie.
        </p>
        <Link href="/game" className="text-[#4fc3f7] hover:text-[#4fc3f7]/70 text-sm transition-colors">
          ← Return to the Nexus
        </Link>
      </Fallback>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#03040a]">
      {avatar && avatar.normieId === normieId ? (
        <BossExperience normieId={normieId} build={avatar} />
      ) : (
        <BossLoader />
      )}
    </div>
  );
}

function Fallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#03040a] flex items-center justify-center px-6">
      <div className="text-center">{children}</div>
    </div>
  );
}

function BossLoader() {
  const id = useNormieStore((s) => s.id);
  const tips = [
    "The Null Normie's HP scales with your Canvas Level — and so do its fragments.",
    "Stay close to strike; step back to avoid the void zones.",
    "WASD to move · Shift to sprint · Space to jump · Click to strike.",
    "Press Esc at any time to pause.",
  ];
  return <LoadingScreen accent="#ff2233" label="Opening the Null Rift…" normieId={id} tips={tips} />;
}
