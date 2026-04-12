"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Location Data (shared with stanton-reference.tsx) ──────────────────────

interface QTLocation {
  name: string;
  system: "stanton" | "pyro";
  parent?: string; // planet name if moon/station
  type: "planet" | "moon" | "station" | "lagrange" | "gateway";
}

const LOCATIONS: QTLocation[] = [
  // Stanton system
  { name: "Lorville", system: "stanton", parent: "Hurston", type: "station" },
  { name: "Everus Harbor", system: "stanton", parent: "Hurston", type: "station" },
  { name: "Arial", system: "stanton", parent: "Hurston", type: "moon" },
  { name: "Aberdeen", system: "stanton", parent: "Hurston", type: "moon" },
  { name: "Magda", system: "stanton", parent: "Hurston", type: "moon" },
  { name: "Ita", system: "stanton", parent: "Hurston", type: "moon" },
  { name: "HUR-L1", system: "stanton", parent: "Hurston", type: "lagrange" },
  { name: "HUR-L2", system: "stanton", parent: "Hurston", type: "lagrange" },

  { name: "Orison", system: "stanton", parent: "Crusader", type: "station" },
  { name: "Seraphim Station", system: "stanton", parent: "Crusader", type: "station" },
  { name: "Cellin", system: "stanton", parent: "Crusader", type: "moon" },
  { name: "Daymar", system: "stanton", parent: "Crusader", type: "moon" },
  { name: "Yela", system: "stanton", parent: "Crusader", type: "moon" },
  { name: "GrimHEX", system: "stanton", parent: "Crusader", type: "station" },
  { name: "CRU-L1", system: "stanton", parent: "Crusader", type: "lagrange" },
  { name: "CRU-L5", system: "stanton", parent: "Crusader", type: "lagrange" },

  { name: "Area 18", system: "stanton", parent: "ArcCorp", type: "station" },
  { name: "Bajini Point", system: "stanton", parent: "ArcCorp", type: "station" },
  { name: "Lyria", system: "stanton", parent: "ArcCorp", type: "moon" },
  { name: "Wala", system: "stanton", parent: "ArcCorp", type: "moon" },
  { name: "ARC-L1", system: "stanton", parent: "ArcCorp", type: "lagrange" },

  { name: "New Babbage", system: "stanton", parent: "microTech", type: "station" },
  { name: "Port Tressler", system: "stanton", parent: "microTech", type: "station" },
  { name: "Calliope", system: "stanton", parent: "microTech", type: "moon" },
  { name: "Clio", system: "stanton", parent: "microTech", type: "moon" },
  { name: "Euterpe", system: "stanton", parent: "microTech", type: "moon" },
  { name: "MIC-L1", system: "stanton", parent: "microTech", type: "lagrange" },

  // Planets (as origin/dest for orbit-to-orbit)
  { name: "Hurston", system: "stanton", type: "planet" },
  { name: "Crusader", system: "stanton", type: "planet" },
  { name: "ArcCorp", system: "stanton", type: "planet" },
  { name: "microTech", system: "stanton", type: "planet" },

  // Pyro system
  { name: "Ruin Station", system: "pyro", type: "station" },
  { name: "Checkmate Station", system: "pyro", type: "station" },
  { name: "Pyro I", system: "pyro", type: "planet" },
  { name: "Monox", system: "pyro", parent: "Pyro II", type: "planet" },
  { name: "Bloom", system: "pyro", parent: "Pyro III", type: "planet" },
  { name: "Ignis", system: "pyro", parent: "Pyro IV", type: "planet" },
  { name: "Terminus", system: "pyro", parent: "Pyro VI", type: "planet" },
];

// Approximate QT times in seconds (simplified estimates)
// Same-parent locations: 30-60s, same-system cross-planet: 3-8 min, cross-system: 10-15 min
function estimateQTTime(from: QTLocation, to: QTLocation): number {
  if (from.name === to.name) return 0;

  // Same parent (e.g. two moons of Crusader)
  if (from.parent && from.parent === to.parent) return 45;

  // One is the parent of the other
  if (from.name === to.parent || to.name === from.parent) return 30;

  // Same system, different planets
  if (from.system === to.system) return 300; // ~5 min

  // Cross-system (requires jump point)
  return 720; // ~12 min
}

function formatTime(seconds: number): string {
  if (seconds === 0) return "—";
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  if (min === 0) return `${sec}s`;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

function buildRoute(from: QTLocation, to: QTLocation): string[] {
  const route: string[] = [from.name];

  if (from.name === to.name) return route;

  // If cross-system, add jump point
  if (from.system !== to.system) {
    if (from.parent) route.push(from.parent);
    route.push(`${from.system === "stanton" ? "Stanton" : "Pyro"} Jump Point`);
    route.push(`${to.system === "stanton" ? "Stanton" : "Pyro"} Jump Point`);
    if (to.parent) route.push(to.parent);
    route.push(to.name);
    return route;
  }

  // Same system, different parent → go through orbital mechanics
  if (from.parent && from.parent !== to.parent) {
    route.push(`${from.parent} Orbit`);
  }
  if (to.parent && from.parent !== to.parent) {
    route.push(`${to.parent} Orbit`);
  }

  route.push(to.name);
  return route;
}

const SYSTEM_COLORS = {
  stanton: "#00ffcc",
  pyro: "#FF6B35",
};

export default function QuantumPlanner() {
  const [open, setOpen] = useState(false);
  const [originIdx, setOriginIdx] = useState<number | null>(null);
  const [destIdx, setDestIdx] = useState<number | null>(null);

  const origin = originIdx !== null ? LOCATIONS[originIdx] : null;
  const dest = destIdx !== null ? LOCATIONS[destIdx] : null;

  const route = useMemo(
    () => (origin && dest ? buildRoute(origin, dest) : []),
    [origin, dest]
  );

  const qtTime = useMemo(
    () => (origin && dest ? estimateQTTime(origin, dest) : 0),
    [origin, dest]
  );

  const isCrossSystem = origin && dest && origin.system !== dest.system;

  // Group locations by system for the select
  const stantonLocs = LOCATIONS.filter((l) => l.system === "stanton");
  const pyroLocs = LOCATIONS.filter((l) => l.system === "pyro");

  return (
    <div className="mtc-panel bg-bg-surface overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-accent" />
          <div>
            <h3 className="font-mono text-xs tracking-[0.2em] text-text-bright uppercase text-left">
              Quantum Travel Planner
            </h3>
            <p className="font-mono text-[9px] text-text-muted tracking-widest">
              ROUTE CALCULATOR — {LOCATIONS.length} DESTINATIONS
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-accent/60"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-4 space-y-4">
              {/* Origin / Destination selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-mono text-[9px] tracking-[0.2em] text-text-dim uppercase">
                    Origin
                  </label>
                  <select
                    value={originIdx ?? ""}
                    onChange={(e) =>
                      setOriginIdx(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mtc-input font-mono text-[11px] w-full"
                  >
                    <option value="">Select origin...</option>
                    <optgroup label="─── STANTON ───">
                      {stantonLocs.map((loc) => {
                        const idx = LOCATIONS.indexOf(loc);
                        return (
                          <option key={idx} value={idx}>
                            {loc.parent ? `  ${loc.name}` : loc.name}
                            {loc.parent ? ` (${loc.parent})` : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="─── PYRO ───">
                      {pyroLocs.map((loc) => {
                        const idx = LOCATIONS.indexOf(loc);
                        return (
                          <option key={idx} value={idx}>
                            {loc.name}
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-[9px] tracking-[0.2em] text-text-dim uppercase">
                    Destination
                  </label>
                  <select
                    value={destIdx ?? ""}
                    onChange={(e) =>
                      setDestIdx(e.target.value ? Number(e.target.value) : null)
                    }
                    className="mtc-input font-mono text-[11px] w-full"
                  >
                    <option value="">Select destination...</option>
                    <optgroup label="─── STANTON ───">
                      {stantonLocs.map((loc) => {
                        const idx = LOCATIONS.indexOf(loc);
                        return (
                          <option key={idx} value={idx}>
                            {loc.parent ? `  ${loc.name}` : loc.name}
                            {loc.parent ? ` (${loc.parent})` : ""}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="─── PYRO ───">
                      {pyroLocs.map((loc) => {
                        const idx = LOCATIONS.indexOf(loc);
                        return (
                          <option key={idx} value={idx}>
                            {loc.name}
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Swap button */}
              {origin && dest && (
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setOriginIdx(destIdx);
                      setDestIdx(originIdx);
                    }}
                    className="font-mono text-[9px] tracking-widest text-text-muted hover:text-accent transition-colors uppercase flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="7 3 3 7 7 11" />
                      <line x1="3" y1="7" x2="21" y2="7" />
                      <polyline points="17 13 21 17 17 21" />
                      <line x1="21" y1="17" x2="3" y2="17" />
                    </svg>
                    Swap Route
                  </button>
                </div>
              )}

              {/* Route visualization */}
              {origin && dest && route.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  {/* Cross-system warning */}
                  {isCrossSystem && (
                    <div className="flex items-center gap-2 px-3 py-2 border border-amber/30 bg-amber/5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber shrink-0">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span className="font-mono text-[9px] tracking-widest text-amber uppercase">
                        Cross-system route — jump point transit required
                      </span>
                    </div>
                  )}

                  {/* Route path */}
                  <div className="relative pl-6">
                    {route.map((waypoint, i) => {
                      const isFirst = i === 0;
                      const isLast = i === route.length - 1;
                      const isJump = waypoint.includes("Jump Point");

                      return (
                        <motion.div
                          key={`${waypoint}-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.2 }}
                          className="relative flex items-center gap-3 py-1.5"
                        >
                          {/* Vertical line connecting dots */}
                          {!isLast && (
                            <div
                              className="absolute left-[3px] top-[18px] w-[2px] h-[calc(100%)]"
                              style={{
                                background: isJump
                                  ? `repeating-linear-gradient(to bottom, ${SYSTEM_COLORS.stanton}, ${SYSTEM_COLORS.stanton} 3px, transparent 3px, transparent 6px)`
                                  : origin.system === "stanton"
                                    ? SYSTEM_COLORS.stanton + "40"
                                    : SYSTEM_COLORS.pyro + "40",
                              }}
                            />
                          )}

                          {/* Dot */}
                          <span
                            className={`w-2 h-2 shrink-0 relative z-10 ${
                              isFirst || isLast ? "" : "opacity-60"
                            } ${isJump ? "animate-pulse" : ""}`}
                            style={{
                              backgroundColor: isJump
                                ? "#F0A500"
                                : isFirst || isLast
                                  ? SYSTEM_COLORS[origin.system]
                                  : "#666",
                            }}
                          />

                          {/* Waypoint name */}
                          <span
                            className={`font-mono tracking-widest uppercase ${
                              isFirst || isLast
                                ? "text-[11px] text-text-bright font-bold"
                                : isJump
                                  ? "text-[10px] text-amber"
                                  : "text-[10px] text-text-dim"
                            }`}
                          >
                            {waypoint}
                          </span>

                          {/* Labels */}
                          {isFirst && (
                            <span className="font-mono text-[8px] text-text-muted tracking-widest">
                              ORIGIN
                            </span>
                          )}
                          {isLast && (
                            <span className="font-mono text-[8px] text-text-muted tracking-widest">
                              DEST
                            </span>
                          )}
                          {isJump && (
                            <span className="font-mono text-[8px] text-amber/60 tracking-widest">
                              JUMP
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* ETA bar */}
                  <div className="flex items-center justify-between px-3 py-2.5 bg-bg-primary border border-border">
                    <div className="flex items-center gap-2">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent/70">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                        Est. QT Time
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-accent font-bold tracking-widest">
                        {formatTime(qtTime)}
                      </span>
                      <span className="font-mono text-[8px] text-text-muted tracking-widest">
                        {route.length} WAYPOINTS
                      </span>
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <p className="font-mono text-[8px] text-text-muted/50 tracking-widest text-center">
                    ESTIMATES BASED ON AVERAGE QT SPEEDS — ACTUAL TIMES MAY VARY BY SHIP
                  </p>
                </motion.div>
              )}

              {/* Empty state */}
              {(!origin || !dest) && (
                <div className="text-center py-4">
                  <p className="font-mono text-[10px] text-text-muted tracking-widest uppercase">
                    Select origin and destination to calculate route
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
