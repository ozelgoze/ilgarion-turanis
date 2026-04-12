"use client";

import { useState, useRef, useEffect } from "react";
import { type ThreatLevel, THREAT_LEVELS } from "@/types/database";

interface ThreatIndicatorProps {
  level: ThreatLevel;
  canEdit: boolean;
  onChange: (level: ThreatLevel) => void;
}

const ALL_LEVELS: ThreatLevel[] = [0, 1, 2, 3];

export default function ThreatIndicator({
  level,
  canEdit,
  onChange,
}: ThreatIndicatorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const info = THREAT_LEVELS[level];

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => canEdit && setMenuOpen((v) => !v)}
        className={[
          "flex items-center gap-1.5 h-7 px-2 font-mono text-[10px] tracking-widest uppercase border transition-all",
          canEdit ? "cursor-pointer" : "cursor-default",
          level === 0
            ? "border-accent/30 text-accent"
            : level === 1
            ? "border-amber/40 text-amber"
            : level === 2
            ? "border-orange-500/40 text-orange-400"
            : "border-danger/50 text-danger animate-pulse",
        ].join(" ")}
        title={canEdit ? "Set threat condition" : info.description}
        style={{
          backgroundColor: level > 0 ? `${info.color}15` : undefined,
        }}
      >
        {/* Threat dot */}
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: info.color,
            boxShadow: level >= 2 ? `0 0 8px ${info.color}80` : undefined,
          }}
        />
        <span>TCON {info.label}</span>
      </button>

      {/* Dropdown */}
      {menuOpen && canEdit && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-full right-0 mt-1 w-64 bg-bg-surface border border-border z-30">
            <div className="px-3 py-2 border-b border-border">
              <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Threat Condition
              </span>
            </div>
            {ALL_LEVELS.map((lvl) => {
              const t = THREAT_LEVELS[lvl];
              const active = lvl === level;
              return (
                <button
                  key={lvl}
                  onClick={() => {
                    onChange(lvl);
                    setMenuOpen(false);
                  }}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2.5 transition-colors",
                    active ? "bg-bg-elevated" : "hover:bg-bg-elevated",
                  ].join(" ")}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{
                      backgroundColor: t.color,
                      boxShadow: active ? `0 0 8px ${t.color}80` : undefined,
                    }}
                  />
                  <div className="text-left min-w-0">
                    <span
                      className="font-mono text-[11px] tracking-widest uppercase font-bold block"
                      style={{ color: t.color }}
                    >
                      TCON {t.label}
                    </span>
                    <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase">
                      {t.description}
                    </span>
                  </div>
                  {active && (
                    <span className="ml-auto font-mono text-[9px] text-accent tracking-widest">
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
