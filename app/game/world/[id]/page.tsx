"use client";

import { use, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { cssColor, PORTALS } from "@/components/nexus/nexusConstants";
import { useNormieStore } from "@/store/useNormieStore";
import { usePlayerStore } from "@/store/usePlayerStore";
import { usePlayerInit } from "@/hooks/usePlayerInit";
import LoadingScreen from "@/components/ui/LoadingScreen";

interface WorldPageProps {
  params: Promise<{ id: string }>;
}

// Three.js is client-only — load the world experience without SSR.
const WorldExperience = dynamic(() => import("@/components/worlds/WorldExperience"), {
  ssr: false,
  loading: () => <WorldLoader />,
});

/**
 * Universe route — a fully playable world generated from the selected Normie
 * (Phase 7). The `id` (cyberpunk / frozen / void) is set by the Nexus portal.
 * Every world property derives from live Normies API data.
 */
export default function WorldPage({ params }: WorldPageProps) {
  const { id } = use(params);

  const router = useRouter();
  const { isConnected, status } = useAccount();

  // Only evaluate wallet state after client mount (avoids hydration mismatch
  // and a false redirect during wallet auto-reconnect on a fresh load).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Ensure the voxel avatar + stats are built from the selected Normie.
  usePlayerInit();

  const portal = PORTALS.find((p) => p.id === id);
  const normieId = useNormieStore((s) => s.id);
  const pixels = useNormieStore((s) => s.pixels);
  const traits = useNormieStore((s) => s.traits);
  const avatar = usePlayerStore((s) => s.avatar);

  // Block access without a connected wallet — bounce to /select with a notice.
  const reconnecting = status === "connecting" || status === "reconnecting";
  useEffect(() => {
    if (mounted && !reconnecting && !isConnected) router.replace("/select?notice=wallet");
  }, [mounted, reconnecting, isConnected, router]);

  if (!mounted || reconnecting) {
    return <LoadingScreen accent="#00ff9d" label="Connecting wallet…" normieId={normieId} />;
  }
  if (!isConnected) return null;

  // Unknown world id.
  if (!portal) {
    return (
      <Fallback>
        <p className="text-white/40 text-sm mb-4">Unknown reality &ldquo;{id}&rdquo;.</p>
        <Link href="/game" className="text-[#4fc3f7] hover:text-[#4fc3f7]/70 text-sm transition-colors">
          ← Return to the Nexus
        </Link>
      </Fallback>
    );
  }

  // No Normie selected — can't generate a world.
  if (normieId === null || !pixels || !traits) {
    return (
      <Fallback>
        <p className="text-white/40 text-sm mb-4">No Normie selected — a world can&apos;t exist without one.</p>
        <Link href="/select" className="text-[#4fc3f7] hover:text-[#4fc3f7]/70 text-sm transition-colors">
          ← Choose your Normie
        </Link>
      </Fallback>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {avatar && avatar.normieId === normieId ? (
        <WorldExperience kind={portal.id} normieId={normieId} build={avatar} />
      ) : (
        <LoadingScreen accent={cssColor(portal.color)} label={`Generating ${portal.label}…`} normieId={normieId} />
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

function WorldLoader() {
  const id = useNormieStore((s) => s.id);
  return <LoadingScreen accent="#00ff9d" label="Generating reality…" normieId={id} />;
}
