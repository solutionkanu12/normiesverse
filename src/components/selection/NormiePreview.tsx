"use client";

import { useMemo } from "react";
import { NORMIE_PIXEL_COUNT } from "@/api/types";
import type { PreviewData } from "./types";

interface NormiePreviewProps {
  data: PreviewData;
  onConfirm: () => void;
}

function calcDensity(pixels: string): number {
  let ones = 0;
  for (let i = 0; i < pixels.length; i++) if (pixels[i] === "1") ones++;
  return (ones / NORMIE_PIXEL_COUNT) * 100;
}

const TRAIT_ROWS: { label: string; key: string }[] = [
  { label: "Type", key: "type" },
  { label: "Gender", key: "gender" },
  { label: "Age", key: "age" },
  { label: "Hair Style", key: "hairStyle" },
  { label: "Facial Feature", key: "facialFeature" },
  { label: "Eyes", key: "eyes" },
  { label: "Expression", key: "expression" },
  { label: "Accessory", key: "accessory" },
];

export default function NormiePreview({ data, onConfirm }: NormiePreviewProps) {
  const { id, traits, canvas, pixels, svgMarkup } = data;

  // Convert raw SVG markup to a data URL so a plain <img> can render it at any
  // size without needing dangerouslySetInnerHTML.
  const svgDataUrl = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`,
    [svgMarkup],
  );

  const density = useMemo(() => calcDensity(pixels), [pixels]);

  return (
    <div className="bg-[#080d1a] rounded-xl border border-[#1a2040] overflow-hidden flex flex-col">
      {/* Large SVG image */}
      <div className="bg-[#03040a] p-4 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgDataUrl}
          alt={`Normie #${id}`}
          className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
        />
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Identity */}
        <div>
          <h2
            className="text-[#4fc3f7] text-2xl font-display leading-tight"
            style={{ fontFamily: "var(--font-lilita), cursive" }}
          >
            Normie #{id}
          </h2>
          <p className="text-white/40 text-xs font-hud mt-0.5 tracking-wider uppercase">
            {traits.type} · {traits.gender} · {traits.age}
          </p>
        </div>

        {/* Trait grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {TRAIT_ROWS.map(({ label, key }) => {
            const raw = (traits as Record<string, unknown>)[key];
            const value = raw != null && raw !== "" ? String(raw) : null;
            if (!value) return null;
            return (
              <div key={key} className="bg-black/30 rounded-lg px-2.5 py-1.5">
                <div className="text-white/35 text-[10px] uppercase tracking-widest leading-3 mb-0.5">
                  {label}
                </div>
                <div className="text-white font-hud text-xs leading-4 truncate">{value}</div>
              </div>
            );
          })}
        </div>

        {/* Canvas stats */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            label="Level"
            value={canvas.level != null ? String(canvas.level) : "—"}
            color="#4fc3f7"
          />
          <StatCard
            label="Action Pts"
            value={canvas.actionPoints != null ? String(canvas.actionPoints) : "—"}
            color="#c9a84c"
          />
          <StatCard
            label="Density"
            value={`${density.toFixed(1)}%`}
            color="#00ff9d"
          />
        </div>

        {canvas.customized && (
          <div className="text-[#00ff9d] text-xs font-hud text-center tracking-wider uppercase">
            ✦ Canvas Customized
          </div>
        )}

        {/* Confirm CTA */}
        <button
          type="button"
          onClick={onConfirm}
          className="w-full py-3.5 rounded-xl bg-[#4fc3f7] hover:bg-[#4fc3f7]/85 active:scale-[0.98] text-[#03040a] text-lg transition-all duration-150"
          style={{ fontFamily: "var(--font-lilita), cursive" }}
        >
          Enter the NormiesVerse
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      className="rounded-lg px-2 py-2 text-center border"
      style={{
        background: `${color}0d`,
        borderColor: `${color}33`,
      }}
    >
      <div className="text-[10px] uppercase tracking-widest leading-3 mb-1" style={{ color: `${color}99` }}>
        {label}
      </div>
      <div className="font-hud text-lg leading-5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
