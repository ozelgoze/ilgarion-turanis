"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TeamMemberWithProfile } from "@/types/database";

interface FleetOverviewProps {
  members: TeamMemberWithProfile[];
}

interface ShipEntry {
  ship: string;
  count: number;
  pilots: string[];
}

export default function FleetOverview({ members }: FleetOverviewProps) {
  const [open, setOpen] = useState(true);

  // Build fleet data — prefer assigned_ship, fall back to profiles.primary_ship
  const shipMap = new Map<string, { count: number; pilots: string[] }>();
  let totalWithShip = 0;

  for (const m of members) {
    const ship = m.assigned_ship || m.profiles?.primary_ship;
    if (!ship) continue;
    const key = ship.trim().toUpperCase();
    totalWithShip++;
    const entry = shipMap.get(key) || { count: 0, pilots: [] };
    entry.count++;
    entry.pilots.push(m.profiles?.callsign ?? "UNKNOWN");
    shipMap.set(key, entry);
  }

  const fleet: ShipEntry[] = Array.from(shipMap.entries())
    .map(([ship, data]) => ({ ship, ...data }))
    .sort((a, b) => b.count - a.count);

  const maxCount = fleet.length > 0 ? fleet[0].count : 1;

  // Org breakdown
  const orgMap = new Map<string, number>();
  for (const m of members) {
    const org = m.profiles?.sc_org?.trim().toUpperCase();
    if (org) {
      orgMap.set(org, (orgMap.get(org) || 0) + 1);
    }
  }
  const orgs = Array.from(orgMap.entries()).sort((a, b) => b[1] - a[1]);

  if (fleet.length === 0 && orgs.length === 0) return null;

  return (
    <div className="mtc-panel bg-bg-surface overflow-hidden mb-6">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-amber" />
          <div>
            <h3 className="font-mono text-xs tracking-[0.2em] text-text-bright uppercase text-left">
              Fleet Overview
            </h3>
            <p className="font-mono text-[9px] text-text-muted tracking-widest">
              {totalWithShip} SHIP{totalWithShip !== 1 ? "S" : ""} REGISTERED — {fleet.length} TYPE{fleet.length !== 1 ? "S" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Fleet strength badge */}
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="font-mono text-[11px] text-amber tracking-widest font-bold">
              {totalWithShip}
            </span>
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
            <div className="border-t border-border">
              {/* Ship composition grid */}
              {fleet.length > 0 && (
                <div className="p-4 space-y-2">
                  <p className="font-mono text-[9px] tracking-widest text-text-muted uppercase mb-3">
                    Ship Composition
                  </p>
                  {fleet.map((entry, i) => (
                    <motion.div
                      key={entry.ship}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.2 }}
                      className="flex items-center gap-3 group"
                    >
                      {/* Ship icon */}
                      <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber/70">
                          <path d="M12 2 L4 9 L4 16 L12 22 L20 16 L20 9 Z" />
                          <line x1="12" y1="2" x2="12" y2="22" />
                          <line x1="4" y1="9" x2="20" y2="9" />
                        </svg>
                      </div>

                      {/* Ship name */}
                      <span className="font-mono text-[11px] tracking-widest text-text-bright uppercase min-w-[140px] shrink-0">
                        {entry.ship}
                      </span>

                      {/* Composition bar */}
                      <div className="flex-1 h-3 bg-bg-primary relative overflow-hidden">
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-amber/30"
                          initial={{ width: 0 }}
                          animate={{ width: `${(entry.count / maxCount) * 100}%` }}
                          transition={{ delay: i * 0.05 + 0.1, duration: 0.4, ease: "easeOut" }}
                        />
                        <motion.div
                          className="absolute inset-y-0 left-0 bg-amber/60"
                          style={{ width: "2px" }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(entry.count / maxCount) * 100}%` }}
                          transition={{ delay: i * 0.05 + 0.1, duration: 0.4, ease: "easeOut" }}
                        />
                      </div>

                      {/* Count */}
                      <span className="font-mono text-[11px] text-amber tracking-widest font-bold min-w-[24px] text-right">
                        ×{entry.count}
                      </span>

                      {/* Pilot names (tooltip-style on hover) */}
                      <span className="font-mono text-[9px] text-text-muted tracking-widest truncate max-w-[120px] opacity-0 group-hover:opacity-100 transition-opacity">
                        {entry.pilots.join(", ")}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Org breakdown */}
              {orgs.length > 0 && (
                <div className="p-4 border-t border-border">
                  <p className="font-mono text-[9px] tracking-widest text-text-muted uppercase mb-3">
                    Org Affiliations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {orgs.map(([org, count]) => (
                      <div
                        key={org}
                        className="flex items-center gap-1.5 px-2.5 py-1 border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors"
                      >
                        <span className="w-1.5 h-1.5 bg-accent/60" />
                        <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
                          {org}
                        </span>
                        <span className="font-mono text-[9px] text-text-muted">
                          ×{count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
