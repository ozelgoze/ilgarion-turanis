"use client";

import { useState } from "react";
import type { GridType } from "./tactical-canvas";

interface CanvasToolbarProps {
  zoom: number;
  gridType: GridType;
  gridSize: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onGridTypeChange: (type: GridType) => void;
  onGridSizeChange: (size: number) => void;
}

export default function CanvasToolbar({
  zoom,
  gridType,
  gridSize,
  onZoomIn,
  onZoomOut,
  onFitView,
  onGridTypeChange,
  onGridSizeChange,
}: CanvasToolbarProps) {
  const [gridMenuOpen, setGridMenuOpen] = useState(false);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="h-9 shrink-0 bg-bg-surface border-b border-border flex items-center px-3 gap-1 z-10 relative">

      {/* ── Zoom Controls ─────────────────────────────────── */}
      <ToolbarGroup>
        <ToolbarBtn onClick={onZoomOut} title="Zoom Out">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </ToolbarBtn>

        <button
          onClick={onFitView}
          title="Fit to view"
          className="font-mono text-[10px] tracking-widest text-text-dim hover:text-accent px-2 h-full min-w-[44px] text-center transition-colors"
        >
          {zoomPct}%
        </button>

        <ToolbarBtn onClick={onZoomIn} title="Zoom In">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </ToolbarBtn>

        <ToolbarBtn onClick={onFitView} title="Fit View">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </ToolbarBtn>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* ── Grid Controls ─────────────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => setGridMenuOpen((v) => !v)}
          className={[
            "flex items-center gap-1.5 px-2 h-7 font-mono text-[10px] tracking-widest uppercase border transition-colors",
            gridType !== "none"
              ? "border-accent/40 text-accent bg-accent/10"
              : "border-transparent text-text-dim hover:text-text-primary",
          ].join(" ")}
        >
          {/* Grid icon */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Grid: {gridType.toUpperCase()}
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="ml-0.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {gridMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-20"
              onClick={() => setGridMenuOpen(false)}
            />
            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-1 w-52 bg-bg-surface border border-border z-30">
              {/* Grid type selector */}
              <div className="p-2 border-b border-border">
                <p className="font-mono text-[9px] tracking-widest text-text-muted uppercase mb-2 px-1">
                  Grid Type
                </p>
                <div className="flex gap-1">
                  {(["none", "square", "hex"] as GridType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { onGridTypeChange(t); if (t === "none") setGridMenuOpen(false); }}
                      className={[
                        "flex-1 py-1 font-mono text-[9px] tracking-widest uppercase border transition-colors",
                        gridType === t
                          ? "border-accent/50 text-accent bg-accent/10"
                          : "border-border text-text-muted hover:border-border-bright",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid size (only when grid is active) */}
              {gridType !== "none" && (
                <div className="p-2">
                  <p className="font-mono text-[9px] tracking-widest text-text-muted uppercase mb-2 px-1">
                    Cell Size: {gridSize}px
                  </p>
                  <input
                    type="range"
                    min={20}
                    max={120}
                    step={5}
                    value={gridSize}
                    onChange={(e) => onGridSizeChange(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-text-muted mt-1 px-0.5">
                    <span>20</span>
                    <span>120</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ToolbarDivider />

      {/* ── Status Label ──────────────────────────────────── */}
      <div className="ml-auto flex items-center gap-3">
        <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase hidden sm:block">
          Tactical Map Engine v7
        </span>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center h-full">{children}</div>;
}

function ToolbarBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        "w-7 h-7 flex items-center justify-center transition-colors",
        active
          ? "text-accent bg-accent/10"
          : "text-text-dim hover:text-text-primary hover:bg-bg-elevated",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-4 bg-border mx-1" />;
}
