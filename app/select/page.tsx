"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import normiesApi from "@/api/normiesApi";
import { useNormieStore } from "@/store/useNormieStore";
import NormieCard from "@/components/selection/NormieCard";
import NormiePreview from "@/components/selection/NormiePreview";
import type { PreviewData } from "@/components/selection/types";

// ---------------------------------------------------------------------------
// Select page
// ---------------------------------------------------------------------------

export default function SelectPage() {
  const router = useRouter();
  const { address } = useAccount();
  const isConnected = !!address;

  const ownedIds = useNormieStore((s) => s.ownedIds);
  const holdingsLoading = useNormieStore((s) => s.holdingsLoading);
  const setNormieId = useNormieStore((s) => s.setId);
  const setNormieData = useNormieStore((s) => s.setData);

  // Tabs
  const [activeTab, setActiveTab] = useState<"owned" | "manual">("manual");
  const userSwitchedTab = useRef(false);

  // Manual ID input
  const [manualInput, setManualInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Preview state
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Auto-switch to "My Normies" when holdings arrive — unless user already
  // manually picked a tab or started typing an ID.
  useEffect(() => {
    if (ownedIds.length > 0 && !userSwitchedTab.current && !manualInput) {
      setActiveTab("owned");
    }
  }, [ownedIds.length, manualInput]);

  const handleTabChange = (tab: "owned" | "manual") => {
    userSwitchedTab.current = true;
    setActiveTab(tab);
  };

  // ─── Preview loading ─────────────────────────────────────────────────────

  const loadPreview = useCallback(async (id: number) => {
    setSelectedId(id);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    try {
      const [traits, canvas, pixels, svgMarkup] = await Promise.all([
        normiesApi.getTraits(id),
        normiesApi.getCanvasInfo(id),
        normiesApi.getPixels(id),
        normiesApi.getImageSvg(id),
      ]);
      setPreview({ id, traits, canvas, pixels, svgMarkup });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load Normie data";
      setPreviewError(msg);
      setSelectedId(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const handleLoadManual = () => {
    setInputError(null);
    const raw = manualInput.trim();
    if (!raw) return;
    const id = Number(raw);
    if (!Number.isInteger(id) || id < 0 || id > 9999) {
      setInputError("Enter a valid Normie ID (0 – 9999)");
      return;
    }
    loadPreview(id);
  };

  // ─── Confirm → save to store and enter game ───────────────────────────────

  const handleConfirm = () => {
    if (!preview) return;
    setNormieId(preview.id);
    setNormieData({
      traits: preview.traits,
      canvas: preview.canvas,
      pixels: preview.pixels,
    });
    router.push("/game");
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-[#03040a]">
      {/* ── Top nav ────────────────────────────────────────────────────── */}
      <header className="border-b border-white/[0.06] px-5 py-3 flex items-center justify-between">
        <span
          className="text-[#4fc3f7] text-xl tracking-wide"
          style={{ fontFamily: "var(--font-lilita), cursive" }}
        >
          NormiesVerse
        </span>
        <ConnectButton />
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="px-5 py-10 text-center border-b border-white/[0.04]">
        <h1
          className="text-4xl sm:text-5xl text-white mb-3"
          style={{ fontFamily: "var(--font-lilita), cursive" }}
        >
          Choose Your Normie
        </h1>
        <p className="text-white/40 text-base max-w-md mx-auto leading-relaxed">
          Your Normie seeds the avatar, world, quests, and final boss.
          Every system derives from on-chain data — no two universes are the same.
        </p>
      </div>

      {/* ── Main 2-col layout ─────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-6">
        {/* ── Left: selector ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Tab bar — only show "My Normies" when wallet is connected */}
          {isConnected ? (
            <div className="flex gap-1 p-1 bg-[#080d1a] rounded-xl border border-[#1a2040]">
              <TabButton
                active={activeTab === "owned"}
                onClick={() => handleTabChange("owned")}
              >
                My Normies
                {ownedIds.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-current/20 text-[10px] font-hud">
                    {ownedIds.length}
                  </span>
                )}
              </TabButton>
              <TabButton
                active={activeTab === "manual"}
                onClick={() => handleTabChange("manual")}
              >
                Enter ID
              </TabButton>
            </div>
          ) : null}

          {/* Tab content */}
          {!isConnected || activeTab === "manual" ? (
            /* ── Manual ID input ─────────────────────────────────────── */
            <div className="bg-[#080d1a] rounded-xl border border-[#1a2040] p-6 flex flex-col gap-4">
              {!isConnected && (
                <div className="flex items-center gap-3 p-3 bg-[#4fc3f7]/5 border border-[#4fc3f7]/15 rounded-lg">
                  <span className="text-[#4fc3f7] text-lg">⬡</span>
                  <p className="text-white/50 text-sm">
                    Connect a wallet to see Normies you own, or explore any
                    Normie by ID below.
                  </p>
                </div>
              )}
              <p className="text-white/50 text-sm">
                Enter any Normie ID (0 – 9999) to preview their universe.
              </p>
              <div className="flex gap-3">
                <input
                  type="number"
                  min={0}
                  max={9999}
                  value={manualInput}
                  onChange={(e) => {
                    setManualInput(e.target.value);
                    setInputError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLoadManual()}
                  placeholder="0 – 9999"
                  className="flex-1 bg-[#03040a] border border-[#1a2040] focus:border-[#4fc3f7] rounded-lg px-4 py-3 text-white placeholder-white/20 outline-none transition-colors font-hud text-base"
                />
                <button
                  type="button"
                  onClick={handleLoadManual}
                  disabled={previewLoading || !manualInput.trim()}
                  className="px-6 py-3 bg-[#4fc3f7] hover:bg-[#4fc3f7]/80 active:scale-95 disabled:opacity-40 text-[#03040a] font-bold rounded-lg transition-all whitespace-nowrap"
                >
                  {previewLoading && selectedId !== null ? "Loading…" : "Load"}
                </button>
              </div>
              {inputError && (
                <p className="text-red-400 text-sm">{inputError}</p>
              )}
            </div>
          ) : (
            /* ── Owned Normies grid ──────────────────────────────────── */
            <div className="bg-[#080d1a] rounded-xl border border-[#1a2040] p-4 flex-1">
              {holdingsLoading ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3">
                  <Spinner />
                  <p className="text-white/30 text-sm">
                    Reading wallet holdings…
                  </p>
                </div>
              ) : ownedIds.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center gap-3 text-center px-6">
                  <p className="text-white/40 text-sm">
                    No Normies found in this wallet.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleTabChange("manual")}
                    className="text-[#4fc3f7] text-sm hover:text-[#4fc3f7]/70 transition-colors"
                  >
                    Browse any Normie by ID →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-7 gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {ownedIds.map((id) => (
                    <NormieCard
                      key={id}
                      id={id}
                      selected={selectedId === id}
                      onClick={loadPreview}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: preview panel ─────────────────────────────────── */}
        <div className="w-full lg:w-[22rem] xl:w-96 shrink-0">
          {previewLoading ? (
            <div className="bg-[#080d1a] rounded-xl border border-[#1a2040] h-64 flex flex-col items-center justify-center gap-3">
              <Spinner />
              <p className="text-white/30 text-sm">Loading Normie data…</p>
            </div>
          ) : previewError ? (
            <div className="bg-[#080d1a] rounded-xl border border-red-500/25 p-6 flex flex-col items-center gap-3">
              <p className="text-red-400 text-sm text-center">{previewError}</p>
              <button
                type="button"
                onClick={() => {
                  setPreviewError(null);
                  setSelectedId(null);
                }}
                className="text-white/30 text-xs hover:text-white/50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          ) : preview ? (
            <NormiePreview data={preview} onConfirm={handleConfirm} />
          ) : (
            <EmptyPreview />
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 flex items-center justify-center gap-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-[#4fc3f7] text-[#03040a]"
          : "text-white/45 hover:text-white/70",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div className="w-7 h-7 border-2 border-[#4fc3f7] border-t-transparent rounded-full animate-spin" />
  );
}

function EmptyPreview() {
  return (
    <div className="bg-[#080d1a] rounded-xl border border-[#1a2040] p-10 flex flex-col items-center justify-center gap-4">
      {/* Pulsing hexagon placeholder */}
      <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[#4fc3f7]/20 flex items-center justify-center animate-pulse">
        <span className="text-[#4fc3f7]/25 text-3xl select-none">⬡</span>
      </div>
      <p className="text-white/25 text-sm text-center leading-relaxed">
        Select a Normie from the grid
        <br />
        or load one by ID to preview
      </p>
    </div>
  );
}
