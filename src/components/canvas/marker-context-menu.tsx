"use client";

import { useState, useRef, useEffect } from "react";
import type { TeamMemberWithProfile } from "@/types/database";

export interface MarkerContextMenuData {
  markerId: string;
  label: string;
  assignedTo: string | null;
  screenX: number;
  screenY: number;
}

interface MarkerContextMenuProps {
  data: MarkerContextMenuData | null;
  teamMembers: TeamMemberWithProfile[];
  onClose: () => void;
  onSave: (markerId: string, label: string, assignedTo: string | null) => void;
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
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state when data changes
  useEffect(() => {
    if (data) {
      setLabel(data.label);
      setAssignedTo(data.assignedTo);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [data]);

  // Close on click outside
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

  // Close on Escape
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
    onSave(data.markerId, label.trim(), assignedTo);
    onClose();
  }

  function handleDelete() {
    if (!data) return;
    onDelete(data.markerId);
    onClose();
  }

  const style: React.CSSProperties = {
    position: "fixed",
    left: data.screenX,
    top: data.screenY,
    zIndex: 9999,
  };

  return (
    <div ref={menuRef} style={style} className="w-72">
      <div className="bg-bg-deep border border-border shadow-xl">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
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
        <div className="px-4 py-3 flex items-center gap-2">
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
