"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
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
  const router = useRouter();
  const { isConnected, status } = useAccount();

  // Only evaluate wallet state after client mount (avoids hydration mismatch
  // and a false redirect during wallet auto-reconnect on a fresh load).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Build avatar + stats from the selected Normie and save to usePlayerStore.
  usePlayerInit();

  const id = useNormieStore((s) => s.id);
  const avatar = usePlayerStore((s) => s.avatar);
  const level = usePlayerStore((s) => s.stats.level);

  // Block access without a connected wallet — bounce to /select with a notice.
  const reconnecting = status === "connecting" || status === "reconnecting";
  useEffect(() => {
    if (mounted && !reconnecting && !isConnected) router.replace("/select?notice=wallet");
  }, [mounted, reconnecting, isConnected, router]);

  if (!mounted || reconnecting) {
    return <LoadingScreen accent="#4fc3f7" label="Connecting wallet…" normieId={id} />;
  }
  if (!isConnected) return null;

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
