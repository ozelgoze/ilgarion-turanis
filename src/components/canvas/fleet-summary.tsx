"use client";

import { useState, useMemo } from "react";
import type { TeamMemberWithProfile } from "@/types/database";
import { SC_SHIP_CATEGORIES } from "./sc-ships";

interface FleetSummaryProps {
  teamMembers: TeamMemberWithProfile[];
}

// Build a lookup: ship name → category
const shipToCategoryMap = new Map<string, string>();
for (const cat of SC_SHIP_CATEGORIES) {
  for (const ship of cat.ships) {
    shipToCategoryMap.set(ship.name.toLowerCase(), cat.label);
    shipToCategoryMap.set(ship.abbr.toLowerCase(), cat.label);
  }
}

function classifyShip(shipName: string): string {
  const lower = shipName.toLowerCase().trim();
  return shipToCategoryMap.get(lower) ?? "Other";
}

interface FleetEntry {
  callsign: string;
  ship: string;
  category: string;
}

export default function FleetSummary({ teamMembers }: FleetSummaryProps) {
  const [open, setOpen] = useState(false);

  const fleet = useMemo(() => {
    const entries: FleetEntry[] = [];
    for (const m of teamMembers) {
      const ship = m.assigned_ship ?? m.profiles?.primary_ship;
      if (ship) {
        entries.push({
          callsign: m.profiles?.callsign ?? "UNKNOWN",
          ship,
          category: classifyShip(ship),
        });
      }
    }
    return entries;
  }, [teamMembers]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of fleet) {
      counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    }
    // Sort: known categories first in defined order, then "Other"
    const ordered: { category: string; count: number }[] = [];
    for (const cat of SC_SHIP_CATEGORIES) {
      const c = counts.get(cat.label);
      if (c) ordered.push({ category: cat.label, count: c });
    }
    const otherCount = counts.get("Other");
    if (otherCount) ordered.push({ category: "Other", count: otherCount });
    return ordered;
  }, [fleet]);

  const CATEGORY_COLORS: Record<string, string> = {
    Fighters: "#00AAFF",
    "Heavy Fighters": "#5B9BD5",
    Bombers: "#FF6B35",
    "Multicrew Combat": "#FF2442",
    "Capital Ships": "#9B7FE8",
    "Cargo / Transport": "#F0A500",
    "Mining / Salvage": "#C4724B",
    "Support / Utility": "#00ffcc",
    "Ground Vehicles": "#556B2F",
    Other: "#666",
  };

  if (fleet.length === 0) return null;

  return (
    <div className="absolute top-14 left-3 z-20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-bg-surface/90 border border-border px-3 py-1.5 backdrop-blur-sm flex items-center gap-2 hover:bg-bg-elevated transition-colors"
        title="Fleet Composition"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
        </svg>
        <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
          Fleet ({fleet.length})
        </span>
        <svg
          width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="mt-1 w-64 bg-bg-surface/95 border border-border backdrop-blur-sm max-h-[50vh] overflow-y-auto">
          {/* Category breakdown bar */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex h-2 overflow-hidden">
              {categoryCounts.map(({ category, count }) => (
                <div
                  key={category}
                  className="h-full"
                  style={{
                    width: `${(count / fleet.length) * 100}%`,
                    backgroundColor: CATEGORY_COLORS[category] ?? "#666",
                  }}
                  title={`${category}: ${count}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
              {categoryCounts.map(({ category, count }) => (
                <div key={category} className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5"
                    style={{ backgroundColor: CATEGORY_COLORS[category] ?? "#666" }}
                  />
                  <span className="font-mono text-[7px] tracking-widest text-text-muted uppercase">
                    {category}: {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Individual fleet entries */}
          <div className="divide-y divide-border/30">
            {fleet.map((entry, i) => (
              <div key={i} className="px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase truncate">
                  {entry.callsign}
                </span>
                <span
                  className="font-mono text-[9px] tracking-widest uppercase shrink-0"
                  style={{ color: CATEGORY_COLORS[entry.category] ?? "#666" }}
                >
                  {entry.ship}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
