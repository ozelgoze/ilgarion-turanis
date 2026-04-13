"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Stanton System Data ─────────────────────────────────────────────────────

interface Location {
  name: string;
  type: "planet" | "moon" | "station" | "lagrange" | "gateway";
  parent?: string;
  notes?: string;
}

interface SystemBody {
  name: string;
  type: "star" | "planet";
  color: string;
  locations: Location[];
}

const STANTON_SYSTEM: SystemBody[] = [
  {
    name: "Stanton (Star)",
    type: "star",
    color: "#FFD700",
    locations: [
      { name: "Stanton — Jump Point to Pyro", type: "gateway", notes: "Active — leads to Pyro system" },
    ],
  },
  {
    name: "Hurston (Stanton I)",
    type: "planet",
    color: "#C4724B",
    locations: [
      { name: "Lorville", type: "station", notes: "Capital city — Teasa Spaceport, CBD, L19 Admin" },
      { name: "Everus Harbor", type: "station", notes: "Orbital station — refuel, rearm, clinic" },
      { name: "HDMS-Edmond", type: "station", notes: "Surface outpost" },
      { name: "HDMS-Oparei", type: "station", notes: "Surface outpost" },
      { name: "HDMS-Hadley", type: "station", notes: "Surface outpost" },
      { name: "HDMS-Stanhope", type: "station", notes: "Surface outpost" },
      { name: "Arial", type: "moon", parent: "Hurston" },
      { name: "Aberdeen", type: "moon", parent: "Hurston", notes: "Toxic atmosphere" },
      { name: "Magda", type: "moon", parent: "Hurston" },
      { name: "Ita", type: "moon", parent: "Hurston" },
      { name: "HUR-L1", type: "lagrange", notes: "Rest stop — Green Imperial" },
      { name: "HUR-L2", type: "lagrange", notes: "Rest stop — Faithful Dream" },
      { name: "HUR-L3", type: "lagrange" },
      { name: "HUR-L4", type: "lagrange" },
      { name: "HUR-L5", type: "lagrange" },
    ],
  },
  {
    name: "Crusader (Stanton II)",
    type: "planet",
    color: "#5B9BD5",
    locations: [
      { name: "Orison", type: "station", notes: "Cloud city — Cloudview Center, August Dunlow Spaceport" },
      { name: "Seraphim Station", type: "station", notes: "Orbital station — refuel, rearm" },
      { name: "Cellin", type: "moon", parent: "Crusader", notes: "Volcanic, Security Post Kareah nearby" },
      { name: "Daymar", type: "moon", parent: "Crusader", notes: "Desert moon, Kudre Ore mining" },
      { name: "Yela", type: "moon", parent: "Crusader", notes: "Ice moon, GrimHEX asteroid base" },
      { name: "GrimHEX", type: "station", notes: "Pirate haven in Yela asteroid belt" },
      { name: "Security Post Kareah", type: "station", notes: "Clearance terminal — clear crimestat" },
      { name: "CRU-L1", type: "lagrange", notes: "Rest stop — Ambitious Dream" },
      { name: "CRU-L4", type: "lagrange" },
      { name: "CRU-L5", type: "lagrange", notes: "Rest stop — Beautiful Glen" },
    ],
  },
  {
    name: "ArcCorp (Stanton III)",
    type: "planet",
    color: "#E67E22",
    locations: [
      { name: "Area 18", type: "station", notes: "Mega-city — Riker Memorial Spaceport, TDD" },
      { name: "Bajini Point", type: "station", notes: "Orbital station — refuel, rearm, clinic" },
      { name: "Lyria", type: "moon", parent: "ArcCorp", notes: "Ice moon — Shubin mining" },
      { name: "Wala", type: "moon", parent: "ArcCorp", notes: "Tidally locked, ArcCorp Mining" },
      { name: "ARC-L1", type: "lagrange", notes: "Rest stop — Wide Forest" },
      { name: "ARC-L2", type: "lagrange" },
      { name: "ARC-L3", type: "lagrange" },
      { name: "ARC-L4", type: "lagrange" },
      { name: "ARC-L5", type: "lagrange" },
    ],
  },
  {
    name: "microTech (Stanton IV)",
    type: "planet",
    color: "#70B8E0",
    locations: [
      { name: "New Babbage", type: "station", notes: "Capital — Aspire Grand, Commons, Spaceport" },
      { name: "Port Tressler", type: "station", notes: "Orbital station — refuel, rearm, clinic" },
      { name: "Calliope", type: "moon", parent: "microTech" },
      { name: "Clio", type: "moon", parent: "microTech" },
      { name: "Euterpe", type: "moon", parent: "microTech" },
      { name: "MIC-L1", type: "lagrange", notes: "Rest stop — Shallow Frontier" },
      { name: "MIC-L2", type: "lagrange" },
      { name: "MIC-L3", type: "lagrange" },
      { name: "MIC-L4", type: "lagrange" },
      { name: "MIC-L5", type: "lagrange" },
    ],
  },
];

// ── Pyro System Data ────────────────────────────────────────────────────────

const PYRO_SYSTEM: SystemBody[] = [
  {
    name: "Pyro (Star)",
    type: "star",
    color: "#FF6B35",
    locations: [
      { name: "Pyro — Jump Point to Stanton", type: "gateway", notes: "Active — connects to Stanton system" },
      { name: "Pyro — Jump Point to Nyx", type: "gateway", notes: "Future — leads to Nyx system" },
    ],
  },
  {
    name: "Pyro I",
    type: "planet",
    color: "#8B4513",
    locations: [
      { name: "Pyro I", type: "planet", notes: "Scorched world — extremely close to star" },
    ],
  },
  {
    name: "Pyro II (Monox)",
    type: "planet",
    color: "#D2691E",
    locations: [
      { name: "Monox", type: "planet", notes: "Toxic atmosphere, unstable surface" },
    ],
  },
  {
    name: "Pyro III (Bloom)",
    type: "planet",
    color: "#4A7023",
    locations: [
      { name: "Bloom", type: "planet", notes: "Habitable potential, dense vegetation zones" },
    ],
  },
  {
    name: "Pyro IV (Ignis)",
    type: "planet",
    color: "#B22222",
    locations: [
      { name: "Ignis", type: "planet", notes: "Volcanic world, lava flows" },
    ],
  },
  {
    name: "Pyro V",
    type: "planet",
    color: "#556B2F",
    locations: [
      { name: "Pyro V", type: "planet", notes: "Rocky world" },
    ],
  },
  {
    name: "Pyro VI (Terminus)",
    type: "planet",
    color: "#4682B4",
    locations: [
      { name: "Terminus", type: "planet", notes: "Gas giant — distant orbit" },
    ],
  },
  {
    name: "Ruin Station",
    type: "planet",
    color: "#FF4444",
    locations: [
      { name: "Ruin Station", type: "station", notes: "Pirate hub — major outlaw gathering point, shops, services" },
      { name: "Checkmate Station", type: "station", notes: "Contested station" },
    ],
  },
];

interface StarSystem {
  id: string;
  name: string;
  color: string;
  data: SystemBody[];
  description: string;
}

const SYSTEMS: StarSystem[] = [
  {
    id: "stanton",
    name: "Stanton",
    color: "#00ffcc",
    data: STANTON_SYSTEM,
    description: "UEE-controlled — 4 planets, major trade hub",
  },
  {
    id: "pyro",
    name: "Pyro",
    color: "#FF6B35",
    data: PYRO_SYSTEM,
    description: "Lawless — pirate haven, no UEE jurisdiction",
  },
];

// ── QT Travel Time Estimates (seconds between major locations in Stanton) ──
// Approximate values based on typical QT speeds (S-size drive)

interface QTRoute {
  from: string;
  to: string;
  /** Estimated seconds in quantum travel (S-size drive) */
  seconds: number;
}

const STANTON_QT_ROUTES: QTRoute[] = [
  // Inter-planet routes
  { from: "Hurston", to: "Crusader", seconds: 390 },
  { from: "Hurston", to: "ArcCorp", seconds: 480 },
  { from: "Hurston", to: "microTech", seconds: 660 },
  { from: "Crusader", to: "ArcCorp", seconds: 270 },
  { from: "Crusader", to: "microTech", seconds: 420 },
  { from: "ArcCorp", to: "microTech", seconds: 330 },
  // Planet to city/station routes
  { from: "Lorville", to: "Everus Harbor", seconds: 30 },
  { from: "Orison", to: "Seraphim Station", seconds: 45 },
  { from: "Area 18", to: "Bajini Point", seconds: 30 },
  { from: "New Babbage", to: "Port Tressler", seconds: 30 },
  // Popular cross-system routes
  { from: "Lorville", to: "Area 18", seconds: 510 },
  { from: "Lorville", to: "New Babbage", seconds: 690 },
  { from: "Lorville", to: "Orison", seconds: 420 },
  { from: "Area 18", to: "New Babbage", seconds: 360 },
  { from: "Area 18", to: "Orison", seconds: 300 },
  { from: "Orison", to: "New Babbage", seconds: 450 },
  { from: "GrimHEX", to: "Orison", seconds: 60 },
  { from: "GrimHEX", to: "Port Tressler", seconds: 435 },
  // Jump point
  { from: "microTech", to: "Stanton — Jump Point to Pyro", seconds: 180 },
  { from: "Hurston", to: "Stanton — Jump Point to Pyro", seconds: 540 },
];

const QT_LOCATIONS = [
  "Hurston", "Lorville", "Everus Harbor",
  "Crusader", "Orison", "Seraphim Station", "GrimHEX",
  "ArcCorp", "Area 18", "Bajini Point",
  "microTech", "New Babbage", "Port Tressler",
  "Stanton — Jump Point to Pyro",
];

function findQTTime(from: string, to: string): number | null {
  if (from === to) return 0;
  const route = STANTON_QT_ROUTES.find(
    (r) => (r.from === from && r.to === to) || (r.from === to && r.to === from)
  );
  return route?.seconds ?? null;
}

function formatQTTime(seconds: number): string {
  if (seconds === 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

const TYPE_ICONS: Record<Location["type"], { symbol: string; color: string }> = {
  planet: { symbol: "●", color: "#70B8E0" },
  moon: { symbol: "○", color: "#666" },
  station: { symbol: "■", color: "#00ffcc" },
  lagrange: { symbol: "◇", color: "#9B7FE8" },
  gateway: { symbol: "⬡", color: "#F0A500" },
};

export default function StantonReference() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeSystem, setActiveSystem] = useState("stanton");
  const [activeTab, setActiveTab] = useState<"map" | "qt">("map");
  const [qtFrom, setQtFrom] = useState(QT_LOCATIONS[0]);
  const [qtTo, setQtTo] = useState(QT_LOCATIONS[3]);

  const system = SYSTEMS.find((s) => s.id === activeSystem) ?? SYSTEMS[0];
  const totalLocations = system.data.reduce((a, b) => a + b.locations.length, 0);

  return (
    <div className="mtc-panel bg-bg-surface overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-5" style={{ backgroundColor: system.color }} />
          <div>
            <h3 className="font-mono text-xs tracking-[0.2em] text-text-bright uppercase text-left">
              Star Map Reference
            </h3>
            <p className="font-mono text-[9px] text-text-muted tracking-widest">
              {SYSTEMS.length} SYSTEMS — {system.name.toUpperCase()}: {totalLocations} LOCATIONS
            </p>
          </div>
        </div>
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
            <div className="border-t border-border">
              {/* System Tabs */}
              <div className="flex border-b border-border">
                {SYSTEMS.map((sys) => (
                  <button
                    key={sys.id}
                    onClick={() => {
                      setActiveSystem(sys.id);
                      setExpanded(null);
                    }}
                    className={[
                      "flex-1 flex items-center justify-center gap-2 py-2.5 font-mono text-[10px] tracking-widest uppercase transition-colors border-b-2",
                      activeSystem === sys.id
                        ? "text-text-bright"
                        : "text-text-muted hover:text-text-dim border-transparent",
                    ].join(" ")}
                    style={{
                      borderBottomColor:
                        activeSystem === sys.id ? sys.color : undefined,
                      backgroundColor:
                        activeSystem === sys.id ? `${sys.color}10` : undefined,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: sys.color }}
                    />
                    {sys.name}
                  </button>
                ))}
              </div>

              {/* Mode Tabs: Map / QT Calculator */}
              <div className="flex border-b border-border">
                {([
                  { id: "map" as const, label: "Locations" },
                  { id: "qt" as const, label: "QT Calculator" },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "flex-1 py-1.5 font-mono text-[9px] tracking-widest uppercase transition-colors",
                      activeTab === tab.id
                        ? "text-accent bg-accent/10"
                        : "text-text-muted hover:text-text-dim",
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* QT Calculator Tab */}
              {activeTab === "qt" && (
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-mono text-[7px] tracking-widest text-text-muted uppercase">
                        From
                      </label>
                      <select
                        value={qtFrom}
                        onChange={(e) => setQtFrom(e.target.value)}
                        className="w-full bg-bg-elevated border border-border px-2 py-1.5 font-mono text-[9px] text-text-bright focus:border-accent/50 focus:outline-none"
                      >
                        {QT_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc} className="bg-bg-surface">{loc}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[7px] tracking-widest text-text-muted uppercase">
                        To
                      </label>
                      <select
                        value={qtTo}
                        onChange={(e) => setQtTo(e.target.value)}
                        className="w-full bg-bg-elevated border border-border px-2 py-1.5 font-mono text-[9px] text-text-bright focus:border-accent/50 focus:outline-none"
                      >
                        {QT_LOCATIONS.map((loc) => (
                          <option key={loc} value={loc} className="bg-bg-surface">{loc}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Result */}
                  {(() => {
                    const time = findQTTime(qtFrom, qtTo);
                    return (
                      <div className="border border-border bg-bg-elevated px-3 py-2 text-center">
                        {time !== null ? (
                          <>
                            <div className="font-mono text-lg tracking-widest text-accent">
                              {formatQTTime(time)}
                            </div>
                            <p className="font-mono text-[7px] tracking-widest text-text-muted uppercase mt-1">
                              Estimated QT time (S-size drive)
                            </p>
                          </>
                        ) : (
                          <p className="font-mono text-[9px] tracking-widest text-text-muted/60 uppercase">
                            No route data available for this pair
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Quick reference table */}
                  <div>
                    <p className="font-mono text-[7px] tracking-widest text-text-muted uppercase mb-1.5">
                      Common Routes
                    </p>
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {STANTON_QT_ROUTES.slice(0, 10).map((r, i) => (
                        <button
                          key={i}
                          onClick={() => { setQtFrom(r.from); setQtTo(r.to); }}
                          className="w-full flex items-center justify-between py-0.5 px-1 hover:bg-accent/5 transition-colors"
                        >
                          <span className="font-mono text-[8px] tracking-wide text-text-dim">
                            {r.from} → {r.to}
                          </span>
                          <span className="font-mono text-[8px] tracking-widest text-accent">
                            {formatQTTime(r.seconds)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="font-mono text-[6px] tracking-widest text-text-muted/40 uppercase text-center">
                    Times are approximate — varies by QT drive and ship mass
                  </p>
                </div>
              )}

              {/* Map Locations Tab */}
              {activeTab === "map" && (
              <>
              {/* System description */}
              <div className="px-4 py-2 border-b border-border">
                <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: system.color }}>
                  {system.description}
                </span>
              </div>

              {/* Legend */}
              <div className="px-4 py-2 flex items-center gap-4 border-b border-border">
                {Object.entries(TYPE_ICONS).map(([type, { symbol, color }]) => (
                  <div key={type} className="flex items-center gap-1">
                    <span style={{ color }} className="text-[10px]">
                      {symbol}
                    </span>
                    <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase">
                      {type}
                    </span>
                  </div>
                ))}
              </div>

              {/* System bodies */}
              {system.data.map((body) => (
                <div key={body.name} className="border-b border-border last:border-b-0">
                  <button
                    onClick={() =>
                      setExpanded((v) => (v === body.name ? null : body.name))
                    }
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-elevated transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: body.color }}
                    />
                    <span className="font-mono text-[11px] tracking-wide text-text-bright uppercase">
                      {body.name}
                    </span>
                    <span className="ml-auto font-mono text-[9px] text-text-muted tracking-widest">
                      {body.locations.length}
                    </span>
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className={`text-text-muted transition-transform ${
                        expanded === body.name ? "rotate-180" : ""
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {expanded === body.name && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 space-y-0.5">
                          {body.locations.map((loc) => {
                            const icon = TYPE_ICONS[loc.type];
                            return (
                              <div
                                key={loc.name}
                                className="flex items-start gap-2 py-1 pl-5"
                              >
                                <span
                                  className="text-[9px] mt-0.5 shrink-0"
                                  style={{ color: icon.color }}
                                >
                                  {icon.symbol}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-mono text-[10px] tracking-wide text-text-dim">
                                    {loc.name}
                                  </span>
                                  {loc.notes && (
                                    <p className="font-mono text-[8px] text-text-muted tracking-widest leading-tight">
                                      {loc.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
