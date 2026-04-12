"use client";

import { useState } from "react";
import type { MarkerAffiliation, MarkerType } from "@/types/database";
import {
  getNatoSvg,
  AFFILIATION_COLORS,
  AFFILIATION_LABELS,
  SC_AFFILIATION_LABELS,
  MARKER_TYPE_LABELS,
  SC_MARKER_TYPE_LABELS,
  SC_MARKER_TYPE_DESCRIPTIONS,
  ALL_MARKER_TYPES,
  ALL_AFFILIATIONS,
  type IconLabelMode,
} from "./nato-icons";

interface IconPaletteProps {
  /** If false, renders nothing (read-only users don't see the palette) */
  visible?: boolean;
}

export default function IconPalette({ visible = true }: IconPaletteProps) {
  const [affiliation, setAffiliation] = useState<MarkerAffiliation>("friendly");
  const [collapsed, setCollapsed] = useState(false);
  const [labelMode, setLabelMode] = useState<IconLabelMode>("sc");

  if (!visible) return null;

  const color = AFFILIATION_COLORS[affiliation];
  const typeLabels =
    labelMode === "sc" ? SC_MARKER_TYPE_LABELS : MARKER_TYPE_LABELS;
  const affLabels =
    labelMode === "sc" ? SC_AFFILIATION_LABELS : AFFILIATION_LABELS;

  function handleDragStart(
    e: React.DragEvent<HTMLDivElement>,
    type: MarkerType,
    aff: MarkerAffiliation
  ) {
    e.dataTransfer.setData(
      "application/x-nato-marker",
      JSON.stringify({ type, affiliation: aff })
    );
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div
      className="absolute left-2 top-2 z-20 flex flex-col pointer-events-auto"
      style={{ maxHeight: "calc(100% - 16px)" }}
    >
      {/* Header / Toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-1.5 h-7 px-2 bg-bg-surface border border-border hover:border-accent/40 hover:text-accent transition-colors text-text-dim"
        title={collapsed ? "Expand icon palette" : "Collapse icon palette"}
      >
        {/* Hamburger icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="5" width="18" height="2" />
          <rect x="3" y="11" width="18" height="2" />
          <rect x="3" y="17" width="18" height="2" />
        </svg>
        <span className="font-mono text-[8px] tracking-[0.2em] uppercase">
          {labelMode === "sc" ? "SC Units" : "NATO"}
        </span>
        <svg
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`ml-0.5 transition-transform ${collapsed ? "" : "rotate-180"}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div
          className="bg-bg-surface border border-t-0 border-border flex flex-col overflow-hidden"
          style={{ width: 116 }}
        >
          {/* NATO / SC mode toggle */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setLabelMode("sc")}
              className={[
                "flex-1 py-1 font-mono text-[7px] tracking-widest uppercase transition-colors",
                labelMode === "sc"
                  ? "text-accent bg-accent/10 border-b-2 border-accent"
                  : "text-text-muted hover:text-text-dim border-b-2 border-transparent",
              ].join(" ")}
            >
              Star Citizen
            </button>
            <button
              onClick={() => setLabelMode("nato")}
              className={[
                "flex-1 py-1 font-mono text-[7px] tracking-widest uppercase transition-colors",
                labelMode === "nato"
                  ? "text-accent bg-accent/10 border-b-2 border-accent"
                  : "text-text-muted hover:text-text-dim border-b-2 border-transparent",
              ].join(" ")}
            >
              NATO
            </button>
          </div>

          {/* Affiliation selector */}
          <div className="flex border-b border-border">
            {ALL_AFFILIATIONS.map((aff) => {
              const active = aff === affiliation;
              return (
                <button
                  key={aff}
                  onClick={() => setAffiliation(aff)}
                  title={affLabels[aff]}
                  className="flex-1 h-6 transition-opacity"
                  style={{
                    backgroundColor: active
                      ? `${AFFILIATION_COLORS[aff]}22`
                      : "transparent",
                    borderBottom: active
                      ? `2px solid ${AFFILIATION_COLORS[aff]}`
                      : "2px solid transparent",
                    opacity: active ? 1 : 0.4,
                  }}
                >
                  {/* Color swatch dot */}
                  <span
                    className="block w-2 h-2 rounded-full mx-auto"
                    style={{ backgroundColor: AFFILIATION_COLORS[aff] }}
                  />
                  <span className="sr-only">{affLabels[aff]}</span>
                </button>
              );
            })}
          </div>

          {/* Current affiliation label */}
          <div className="px-2 py-1 border-b border-border shrink-0">
            <span
              className="font-mono text-[8px] tracking-[0.15em] uppercase font-semibold"
              style={{ color }}
            >
              {affLabels[affiliation]}
            </span>
          </div>

          {/* Icons grid — scrollable */}
          <div className="p-1.5 grid grid-cols-2 gap-1 overflow-y-auto">
            {ALL_MARKER_TYPES.map((type) => {
              const svg = getNatoSvg(type, affiliation);
              const tooltip =
                labelMode === "sc"
                  ? SC_MARKER_TYPE_DESCRIPTIONS[type]
                  : `${MARKER_TYPE_LABELS[type]} · ${AFFILIATION_LABELS[affiliation]}`;
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type, affiliation)}
                  title={tooltip}
                  className="
                    flex flex-col items-center gap-0.5 p-1 select-none
                    border border-transparent cursor-grab active:cursor-grabbing
                    hover:bg-bg-elevated hover:border-border
                    transition-colors
                  "
                >
                  <div
                    className="w-10 h-10 shrink-0"
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  <span
                    className="font-mono text-[6.5px] tracking-wide text-center leading-tight uppercase"
                    style={{ color }}
                  >
                    {typeLabels[type]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="px-2 py-1.5 border-t border-border shrink-0">
            <p className="font-mono text-[7px] text-text-muted tracking-widest text-center uppercase">
              Drag to map
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
