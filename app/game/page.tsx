"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useNormieStore } from "@/store/useNormieStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { usePlayerInit } from "@/hooks/usePlayerInit";
import LoadingScreen from "@/components/ui/LoadingScreen";

// Three.js is client-only — load the Nexus world without SSR.
const NexusWorld = dynamic(() => import("@/components/nexus/NexusWorld"), {
  ssr: false,
  loading: () => <NexusLoader />,
});

/**
 * Game page — the playable Nexus. Builds the voxel avatar from the selected
 * Normie (Phase 4) and drops the player into the 3D space station (Phase 5).
 */
export default function GamePage() {
  // Build avatar + stats from the selected Normie and save to usePlayerStore.
  usePlayerInit();

  const id = useNormieStore((s) => s.id);
  const avatar = usePlayerStore((s) => s.avatar);
  const level = usePlayerStore((s) => s.stats.level);

  if (id === null) {
    return (
      <div className="min-h-screen bg-[#03040a] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white/40 text-sm mb-4">No Normie selected.</p>
          <Link href="/select" className="text-[#4fc3f7] hover:text-[#4fc3f7]/70 text-sm transition-colors">
            ← Back to selection
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#03040a]">
      {avatar ? <NexusWorld build={avatar} level={level} /> : <NexusLoader />}

      {/* Exit to selection — sits above the HUD */}
      <Link
        href="/select"
        className="absolute bottom-5 right-6 z-10 font-hud text-[10px] tracking-[0.2em] text-white/30 hover:text-white/70 transition-colors uppercase"
      >
        ← Leave Nexus
      </Link>
    </div>
  );
}

function NexusLoader() {
  const id = useNormieStore((s) => s.id);
  return <LoadingScreen accent="#4fc3f7" label="Initializing Nexus…" normieId={id} />;
}
