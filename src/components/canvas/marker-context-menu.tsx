"use client";

import { useState, useRef, useEffect } from "react";
import type { TeamMemberWithProfile } from "@/types/database";
import { SC_SHIP_CATEGORIES } from "./sc-ships";

// ── SC Waypoint Quick-Labels ────────────────────────────────────────────────
interface WaypointTag {
  label: string;
  abbr: string;
  color: string;
  description: string;
}

const SC_WAYPOINT_TAGS: { category: string; tags: WaypointTag[] }[] = [
  {
    category: "Navigation",
    tags: [
      { label: "Landing Zone", abbr: "LZ", color: "#00ffcc", description: "Designated landing area" },
      { label: "Rally Point", abbr: "RP", color: "#F0A500", description: "Regroup / staging point" },
      { label: "QT Marker", abbr: "QT", color: "#70B8E0", description: "Quantum travel destination" },
      { label: "Jump Point", abbr: "JP", color: "#9B7FE8", description: "System jump gate" },
      { label: "OM Point", abbr: "OM", color: "#5B9BD5", description: "Orbital marker" },
    ],
  },
  {
    category: "Threats",
    tags: [
      { label: "Interdiction Zone", abbr: "IDZ", color: "#FF2442", description: "QT interdiction area" },
      { label: "Kill Zone", abbr: "KZ", color: "#FF2442", description: "Hostile fire zone" },
      { label: "Ambush Point", abbr: "AMB", color: "#FF6B35", description: "Likely ambush location" },
      { label: "Comm Array", abbr: "COM", color: "#FF8C00", description: "Comm array — disabling removes crimestat" },
      { label: "Armistice", abbr: "ARM", color: "#00ffcc", description: "Armistice zone — no weapons" },
    ],
  },
  {
    category: "Objectives",
    tags: [
      { label: "Extraction Point", abbr: "EXF", color: "#00ffcc", description: "Extraction / pickup" },
      { label: "Drop Zone", abbr: "DZ", color: "#F0A500", description: "Cargo / personnel drop" },
      { label: "Overwatch", abbr: "OW", color: "#70B8E0", description: "Elevated observation position" },
      { label: "Salvage", abbr: "SAL", color: "#D2691E", description: "Salvage / loot site" },
      { label: "Mining Site", abbr: "MINE", color: "#C4724B", description: "Mining deposit" },
      { label: "Bunker", abbr: "BNK", color: "#556B2F", description: "Underground bunker mission" },
    ],
  },
];

export const LABEL_SIZES = [
  { value: 10, label: "S" },
  { value: 14, label: "M" },
  { value: 20, label: "L" },
];

export interface MarkerContextMenuData {
  markerId: string;
  label: string;
  assignedTo: string | null;
  labelSize: number;
  updatedAt?: string;
  screenX: number;
  screenY: number;
}

interface MarkerContextMenuProps {
  data: MarkerContextMenuData | null;
  teamMembers: TeamMemberWithProfile[];
  onClose: () => void;
  onSave: (markerId: string, label: string, assignedTo: string | null, labelSize: number) => void;
  onDelete: (markerId: string) => void;
}

export default function MarkerContextMenu({
  data,
  teamMembers,
  onClose,
  onSave,
  onDelete,
}: MarkerContextMenuProps) {
  const [label, setLabel] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [labelSize, setLabelSize] = useState(14);
  const [shipExpanded, setShipExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setLabel(data.label);
      setAssignedTo(data.assignedTo);
      setLabelSize(data.labelSize || 14);
      setShipExpanded(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [data, onClose]);

  useEffect(() => {
    if (!data) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [data, onClose]);

  if (!data) return null;

  function handleSave() {
    if (!data) return;
    onSave(data.markerId, label.trim(), assignedTo, labelSize);
    onClose();
  }

  function handleDelete() {
    if (!data) return;
    onDelete(data.markerId);
    onClose();
  }

  function applyShip(shipName: string) {
    // Append ship name to the label
    const current = label.trim();
    if (current) {
      setLabel(`${current} [${shipName}]`);
    } else {
      setLabel(shipName);
    }
    setShipExpanded(false);
  }

  const style: React.CSSProperties = {
    position: "fixed",
    left: data.screenX,
    top: data.screenY,
    zIndex: 9999,
  };

  return (
    <div ref={menuRef} style={style} className="w-72">
      <div className="bg-bg-primary border border-border shadow-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between sticky top-0 bg-bg-primary z-10">
          <span className="font-mono text-[11px] tracking-widest text-text-muted uppercase">
            Marker Config
          </span>
          <button
            onClick={onClose}
            className="font-mono text-sm text-text-muted hover:text-text-bright transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Label */}
        <div className="px-4 py-3 border-b border-border/50">
          <label className="block font-mono text-[10px] tracking-widest text-text-muted uppercase mb-1.5">
            Designation
          </label>
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Alpha Squad"
            maxLength={40}
            className="w-full bg-bg-surface border border-border px-2.5 py-2 font-mono text-sm text-text-bright placeholder:text-text-muted/40 focus:border-amber/50 focus:outline-none transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              e.stopPropagation();
            }}
          />
        </div>

        {/* SC Waypoint Quick-Labels */}
        <div className="px-4 py-3 border-b border-border/50">
          <label className="block font-mono text-[10px] tracking-widest text-text-muted uppercase mb-2">
            Waypoint Tag
          </label>
          {SC_WAYPOINT_TAGS.map((cat) => (
            <div key={cat.category} className="mb-1.5 last:mb-0">
              <span className="font-mono text-[7px] tracking-widest text-text-muted/60 uppercase">
                {cat.category}
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {cat.tags.map((tag) => (
                  <button
                    key={tag.abbr}
                    type="button"
                    onClick={() => {
                      const current = label.trim();
                      setLabel(current ? `[${tag.abbr}] ${current}` : `[${tag.abbr}]`);
                    }}
                    title={`${tag.label} — ${tag.description}`}
                    className="px-1.5 py-0.5 font-mono text-[9px] tracking-wide uppercase border transition-colors hover:bg-opacity-20"
                    style={{
                      color: tag.color,
                      borderColor: `${tag.color}40`,
                      backgroundColor: `${tag.color}08`,
                    }}
                  >
                    {tag.abbr}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Ship Quick-Pick */}
        <div className="px-4 py-3 border-b border-border/50">
          <button
            type="button"
            onClick={() => setShipExpanded((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <span className="font-mono text-[10px] tracking-widest text-text-muted uppercase">
              Ship / Vehicle
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[8px] tracking-widest text-accent/60 uppercase">
                {shipExpanded ? "CLOSE" : "SELECT"}
              </span>
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className={`text-text-muted transition-transform ${shipExpanded ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>

          {shipExpanded && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-border bg-bg-surface">
              {SC_SHIP_CATEGORIES.map((cat) => (
                <div key={cat.id}>
                  <div className="px-2 py-1 bg-bg-elevated border-b border-border">
                    <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase">
                      {cat.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2">
                    {cat.ships.map((ship) => (
                      <button
                        key={ship.name}
                        type="button"
                        onClick={() => applyShip(ship.name)}
                        className="px-2 py-1 text-left font-mono text-[9px] tracking-wide text-text-dim hover:bg-accent/10 hover:text-accent transition-colors truncate border-b border-border/30"
                        title={`${ship.name} (${ship.manufacturer})`}
                      >
                        {ship.abbr}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Label Size */}
        <div className="px-4 py-3 border-b border-border/50">
          <label className="block font-mono text-[10px] tracking-widest text-text-muted uppercase mb-1.5">
            Label Size
          </label>
          <div className="flex gap-1.5">
            {LABEL_SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setLabelSize(s.value)}
                className={[
                  "flex-1 py-1.5 font-mono text-[11px] tracking-widest uppercase border transition-colors",
                  labelSize === s.value
                    ? "border-amber/50 text-amber bg-amber/10"
                    : "border-border text-text-muted hover:border-border-bright",
                ].join(" ")}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assign to */}
        <div className="px-4 py-3 border-b border-border/50">
          <label className="block font-mono text-[10px] tracking-widest text-text-muted uppercase mb-1.5">
            Assigned To
          </label>
          <select
            value={assignedTo ?? ""}
            onChange={(e) => setAssignedTo(e.target.value || null)}
            className="w-full bg-bg-surface border border-border px-2.5 py-2 font-mono text-sm text-text-bright focus:border-amber/50 focus:outline-none transition-colors"
          >
            <option value="">— Unassigned —</option>
            {teamMembers.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profiles.callsign} ({m.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-2 sticky bottom-0 bg-bg-primary">
          <button
            onClick={handleSave}
            className="flex-1 bg-amber/20 border border-amber/40 px-3 py-2 font-mono text-[11px] tracking-widest text-amber uppercase hover:bg-amber/30 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 border border-red-500/30 font-mono text-[11px] tracking-widest text-red-400 uppercase hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
