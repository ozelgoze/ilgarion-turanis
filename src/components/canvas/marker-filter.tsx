"use client";

import { useState } from "react";
import type { MarkerType, MarkerAffiliation } from "@/types/database";

const AFFILIATIONS: { value: MarkerAffiliation; label: string; color: string }[] = [
  { value: "friendly", label: "Friendly", color: "#00AAFF" },
  { value: "hostile", label: "Hostile", color: "#FF2442" },
  { value: "neutral", label: "Neutral", color: "#00ff00" },
  { value: "unknown", label: "Unknown", color: "#F0A500" },
];

const MARKER_TYPES: { value: MarkerType; label: string }[] = [
  { value: "infantry", label: "FPS/Infantry" },
  { value: "armor", label: "Ground Veh" },
  { value: "air", label: "Fighters" },
  { value: "naval", label: "Capital" },
  { value: "artillery", label: "Bombers" },
  { value: "hq", label: "Flagship/HQ" },
  { value: "recon", label: "Scouts" },
  { value: "medical", label: "Medical" },
  { value: "logistics", label: "Cargo" },
  { value: "custom", label: "POI" },
];

export interface MarkerFilters {
  affiliations: Set<MarkerAffiliation>;
  types: Set<MarkerType>;
}

interface MarkerFilterProps {
  filters: MarkerFilters;
  onFiltersChange: (filters: MarkerFilters) => void;
}

export function createDefaultFilters(): MarkerFilters {
  return {
    affiliations: new Set(AFFILIATIONS.map((a) => a.value)),
    types: new Set(MARKER_TYPES.map((t) => t.value)),
  };
}

export default function MarkerFilter({ filters, onFiltersChange }: MarkerFilterProps) {
  const [open, setOpen] = useState(false);

  const allAffilVisible = filters.affiliations.size === AFFILIATIONS.length;
  const allTypesVisible = filters.types.size === MARKER_TYPES.length;
  const hasActiveFilter = !allAffilVisible || !allTypesVisible;

  function toggleAffiliation(aff: MarkerAffiliation) {
    const next = new Set(filters.affiliations);
    if (next.has(aff)) {
      if (next.size <= 1) return; // keep at least one
      next.delete(aff);
    } else {
      next.add(aff);
    }
    onFiltersChange({ ...filters, affiliations: next });
  }

  function toggleType(type: MarkerType) {
    const next = new Set(filters.types);
    if (next.has(type)) {
      if (next.size <= 1) return;
      next.delete(type);
    } else {
      next.add(type);
    }
    onFiltersChange({ ...filters, types: next });
  }

  function showAll() {
    onFiltersChange(createDefaultFilters());
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-1.5 px-2 h-7 font-mono text-[11px] tracking-widest uppercase border transition-colors",
          hasActiveFilter
            ? "border-amber/40 text-amber bg-amber/10"
            : "border-transparent text-text-dim hover:text-text-primary",
        ].join(" ")}
        title="Filter markers by type/affiliation"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        FILTER
        {hasActiveFilter && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-56 bg-bg-surface border border-border z-30">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Marker Filters
              </span>
              {hasActiveFilter && (
                <button
                  onClick={showAll}
                  className="font-mono text-[8px] tracking-widest text-accent hover:text-accent/80 uppercase"
                >
                  Show All
                </button>
              )}
            </div>

            {/* Affiliation */}
            <div className="px-3 py-2 border-b border-border">
              <p className="font-mono text-[8px] tracking-widest text-text-muted/60 uppercase mb-1.5">
                Affiliation
              </p>
              <div className="flex flex-wrap gap-1">
                {AFFILIATIONS.map((aff) => {
                  const active = filters.affiliations.has(aff.value);
                  return (
                    <button
                      key={aff.value}
                      onClick={() => toggleAffiliation(aff.value)}
                      className={[
                        "px-2 py-1 font-mono text-[9px] tracking-widest uppercase border transition-colors",
                        active
                          ? "bg-opacity-15"
                          : "border-border/50 text-text-muted/30 line-through",
                      ].join(" ")}
                      style={
                        active
                          ? { color: aff.color, borderColor: `${aff.color}50`, backgroundColor: `${aff.color}15` }
                          : undefined
                      }
                    >
                      {aff.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Type */}
            <div className="px-3 py-2">
              <p className="font-mono text-[8px] tracking-widest text-text-muted/60 uppercase mb-1.5">
                Unit Type
              </p>
              <div className="grid grid-cols-2 gap-1">
                {MARKER_TYPES.map((mt) => {
                  const active = filters.types.has(mt.value);
                  return (
                    <button
                      key={mt.value}
                      onClick={() => toggleType(mt.value)}
                      className={[
                        "px-2 py-1 text-left font-mono text-[9px] tracking-wide uppercase border transition-colors",
                        active
                          ? "border-accent/30 text-text-dim"
                          : "border-border/30 text-text-muted/30 line-through",
                      ].join(" ")}
                    >
                      {mt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
