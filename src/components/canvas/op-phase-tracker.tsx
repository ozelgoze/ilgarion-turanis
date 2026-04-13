"use client";

import { useState } from "react";

// ── Operation Phases ────────────────────────────────────────────────────────

export interface OpPhase {
  id: string;
  label: string;
  abbr: string;
  color: string;
  icon: string; // simple SVG path or symbol
  description: string;
}

export const OP_PHASES: OpPhase[] = [
  {
    id: "planning",
    label: "Planning",
    abbr: "PLAN",
    color: "#70B8E0",
    icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
    description: "Briefing, loadout selection, route planning",
  },
  {
    id: "staging",
    label: "Staging",
    abbr: "STAGE",
    color: "#F0A500",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    description: "Fleet assembly, comms check, rally at staging point",
  },
  {
    id: "transit",
    label: "Transit",
    abbr: "QT",
    color: "#9B7FE8",
    icon: "M13 17l5-5-5-5M6 17l5-5-5-5",
    description: "Quantum travel / en route to AO",
  },
  {
    id: "engagement",
    label: "Engagement",
    abbr: "ENGAGE",
    color: "#FF2442",
    icon: "M18.36 5.64a9 9 0 1 1-12.73 0M12 2v10",
    description: "Active combat / mission execution",
  },
  {
    id: "extraction",
    label: "Extraction",
    abbr: "EXFIL",
    color: "#FF8C00",
    icon: "M5 12h14M12 5l7 7-7 7",
    description: "Withdraw to extraction point, secure cargo",
  },
  {
    id: "debrief",
    label: "Debrief",
    abbr: "DEBRIEF",
    color: "#00ffcc",
    icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
    description: "Mission complete, AAR, payout distribution",
  },
];

interface OpPhaseTrackerProps {
  currentPhase: string;
  canEdit: boolean;
  onPhaseChange?: (phaseId: string) => void;
}

export default function OpPhaseTracker({
  currentPhase,
  canEdit,
  onPhaseChange,
}: OpPhaseTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const currentIdx = OP_PHASES.findIndex((p) => p.id === currentPhase);
  const phase = OP_PHASES[currentIdx] ?? OP_PHASES[0];

  return (
    <div className="relative">
      {/* Phase indicator button */}
      <button
        onClick={() => canEdit && setExpanded((v) => !v)}
        className={[
          "flex items-center gap-1.5 px-2.5 h-7 font-mono text-[11px] tracking-widest uppercase border transition-colors",
          canEdit ? "cursor-pointer" : "cursor-default",
          "border-transparent hover:border-opacity-40",
        ].join(" ")}
        style={{ color: phase.color }}
        title={`Op Phase: ${phase.label} — ${phase.description}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={phase.icon} />
        </svg>
        <span className="hidden sm:inline">{phase.abbr}</span>

        {/* Phase progress dots */}
        <div className="flex items-center gap-0.5 ml-1">
          {OP_PHASES.map((p, i) => (
            <div
              key={p.id}
              className="w-1 h-1"
              style={{
                backgroundColor: i <= currentIdx ? phase.color : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </button>

      {/* Phase selector dropdown */}
      {expanded && canEdit && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setExpanded(false)} />
          <div className="absolute top-full right-0 mt-1 w-64 bg-bg-surface border border-border z-30">
            <div className="px-3 py-2 border-b border-border">
              <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Operation Phase
              </span>
            </div>

            {OP_PHASES.map((p, i) => {
              const isActive = p.id === currentPhase;
              const isPast = i < currentIdx;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onPhaseChange?.(p.id);
                    setExpanded(false);
                  }}
                  className={[
                    "w-full px-3 py-2 flex items-center gap-3 text-left transition-colors border-b border-border/30 last:border-b-0",
                    isActive ? "bg-bg-elevated" : "hover:bg-bg-elevated/50",
                  ].join(" ")}
                >
                  {/* Phase number */}
                  <span
                    className={[
                      "w-5 h-5 flex items-center justify-center font-mono text-[9px] tracking-widest border shrink-0",
                      isActive ? "border-current" : isPast ? "border-current/30" : "border-border",
                    ].join(" ")}
                    style={{ color: isActive ? p.color : isPast ? `${p.color}60` : undefined }}
                  >
                    {i + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[10px] tracking-widest uppercase"
                        style={{ color: isActive ? p.color : isPast ? `${p.color}60` : undefined }}
                      >
                        {p.label}
                      </span>
                      {isActive && (
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ backgroundColor: p.color }}
                        />
                      )}
                    </div>
                    <p className="font-mono text-[7px] tracking-widest text-text-muted/60 leading-tight mt-0.5">
                      {p.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
