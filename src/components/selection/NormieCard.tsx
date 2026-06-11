"use client";

import { NORMIES_API_BASE } from "@/api/normiesApi";

interface NormieCardProps {
  id: number;
  selected?: boolean;
  onClick: (id: number) => void;
}

/**
 * Single card in the owned-Normies grid. Displays the SVG thumbnail via a
 * direct <img> tag (browser-native lazy loading) and highlights when selected.
 */
export default function NormieCard({ id, selected = false, onClick }: NormieCardProps) {
  const svgUrl = `${NORMIES_API_BASE}/normie/${id}/image.svg`;

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      title={`Normie #${id}`}
      className={[
        "relative aspect-square rounded-lg overflow-hidden",
        "border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4fc3f7]",
        selected
          ? "border-[#4fc3f7] ring-2 ring-[#4fc3f7]/30 bg-[#4fc3f7]/5 scale-[1.02]"
          : "border-[#1a2040] hover:border-[#4fc3f7]/60 bg-[#080d1a] hover:bg-[#0d1128]",
      ].join(" ")}
    >
      {/* SVG image fetched directly by the browser — no JS cache needed here */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={svgUrl}
        alt={`Normie #${id}`}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain"
      />

      {/* Token ID badge */}
      <div
        className={[
          "absolute bottom-0 left-0 right-0 py-0.5 px-1",
          "text-[10px] text-center bg-black/70 font-hud leading-4",
          selected ? "text-[#4fc3f7]" : "text-white/50",
        ].join(" ")}
      >
        #{id}
      </div>
    </button>
  );
}
