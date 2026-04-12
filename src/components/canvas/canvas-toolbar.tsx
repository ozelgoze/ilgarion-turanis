"use client";

import { useState, useCallback } from "react";
import type { GridType } from "./tactical-canvas";
import { DRAW_COLORS, DRAW_WIDTHS, type DrawTool } from "./drawing-helpers";
import KeyboardShortcuts from "./keyboard-shortcuts";
import ThreatIndicator from "./threat-indicator";
import type { ThreatLevel } from "@/types/database";

interface CanvasToolbarProps {
  zoom: number;
  gridType: GridType;
  gridSize: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onGridTypeChange: (type: GridType) => void;
  onGridSizeChange: (size: number) => void;

  // ─── Drawing controls (only used when canEdit is true) ─────────
  canEdit?: boolean;
  drawTool?: DrawTool;
  drawColor?: string;
  drawStrokeWidth?: number;
  onDrawToolChange?: (tool: DrawTool) => void;
  onDrawColorChange?: (color: string) => void;
  onDrawStrokeWidthChange?: (width: number) => void;

  // ─── Action buttons ───────────────────────────────────────────
  onExportPNG?: () => void;
  onToggleSitrep?: () => void;
  sitrepOpen?: boolean;

  // ─── Keyboard shortcut callbacks ─────────────────────────────
  onDeselect?: () => void;
  onDeleteSelected?: () => void;

  // ─── Threat level ──────────────────────────────────────────
  threatLevel?: ThreatLevel;
  onThreatLevelChange?: (level: ThreatLevel) => void;
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
  canEdit = false,
  drawTool = "select",
  drawColor = "#00ffcc",
  drawStrokeWidth = 3,
  onDrawToolChange,
  onDrawColorChange,
  onDrawStrokeWidthChange,
  onExportPNG,
  onToggleSitrep,
  sitrepOpen = false,
  onDeselect,
  onDeleteSelected,
  threatLevel = 0,
  onThreatLevelChange,
}: CanvasToolbarProps) {
  const [gridMenuOpen, setGridMenuOpen] = useState(false);

  const cycleGrid = useCallback(() => {
    const cycle: GridType[] = ["none", "square", "hex"];
    const idx = cycle.indexOf(gridType);
    onGridTypeChange(cycle[(idx + 1) % cycle.length]);
  }, [gridType, onGridTypeChange]);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div className="h-10 shrink-0 bg-bg-surface border-b border-border flex items-center px-3 gap-1 z-10 relative">

      {/* ── Zoom Controls ─────────────────────────────────── */}
      <ToolbarGroup>
        <ToolbarBtn onClick={onZoomOut} title="Zoom Out">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </ToolbarBtn>

        <button
          onClick={onFitView}
          title="Fit to view"
          className="font-mono text-[11px] tracking-widest text-text-dim hover:text-accent px-2 h-full min-w-[44px] text-center transition-colors"
        >
          {zoomPct}%
        </button>

        <ToolbarBtn onClick={onZoomIn} title="Zoom In">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </ToolbarBtn>

        <ToolbarBtn onClick={onFitView} title="Fit View">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            "flex items-center gap-1.5 px-2 h-7 font-mono text-[11px] tracking-widest uppercase border transition-colors",
            gridType !== "none"
              ? "border-accent/40 text-accent bg-accent/10"
              : "border-transparent text-text-dim hover:text-text-primary",
          ].join(" ")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <div
              className="fixed inset-0 z-20"
              onClick={() => setGridMenuOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-52 bg-bg-surface border border-border z-30">
              <div className="p-2 border-b border-border">
                <p className="font-mono text-[10px] tracking-widest text-text-muted uppercase mb-2 px-1">
                  Grid Type
                </p>
                <div className="flex gap-1">
                  {(["none", "square", "hex"] as GridType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { onGridTypeChange(t); if (t === "none") setGridMenuOpen(false); }}
                      className={[
                        "flex-1 py-1 font-mono text-[10px] tracking-widest uppercase border transition-colors",
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

              {gridType !== "none" && (
                <div className="p-2">
                  <p className="font-mono text-[10px] tracking-widest text-text-muted uppercase mb-2 px-1">
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
                  <div className="flex justify-between font-mono text-[10px] text-text-muted mt-1 px-0.5">
                    <span>20</span>
                    <span>120</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Drawing Controls (editors only) ─────────────────── */}
      {canEdit && (
        <>
          <ToolbarDivider />

          <ToolbarGroup>
            <ToolbarBtn
              onClick={() => onDrawToolChange?.("select")}
              title="Select / Move"
              active={drawTool === "select"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 2 L3 17 L8 13 L11 20 L14 19 L11 12 L17 12 Z" />
              </svg>
            </ToolbarBtn>

            <ToolbarBtn
              onClick={() => onDrawToolChange?.("line")}
              title="Draw Line"
              active={drawTool === "line"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="19" x2="19" y2="5" />
              </svg>
            </ToolbarBtn>

            <ToolbarBtn
              onClick={() => onDrawToolChange?.("arrow")}
              title="Draw Arrow (line of advance)"
              active={drawTool === "arrow"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="19" x2="17" y2="7" />
                <polyline points="11 6 17 6 17 12" />
              </svg>
            </ToolbarBtn>

            <ToolbarBtn
              onClick={() => onDrawToolChange?.("rectangle")}
              title="Draw Rectangle (perimeter)"
              active={drawTool === "rectangle"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="5" width="16" height="14" />
              </svg>
            </ToolbarBtn>

            <ToolbarBtn
              onClick={() => onDrawToolChange?.("circle")}
              title="Draw Circle (AO)"
              active={drawTool === "circle"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8" />
              </svg>
            </ToolbarBtn>

            <ToolbarBtn
              onClick={() => onDrawToolChange?.("measure")}
              title="Measure Distance"
              active={drawTool === "measure"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="20" x2="20" y2="4" />
                <line x1="4" y1="20" x2="4" y2="15" />
                <line x1="4" y1="20" x2="9" y2="20" />
                <line x1="20" y1="4" x2="20" y2="9" />
                <line x1="20" y1="4" x2="15" y2="4" />
              </svg>
            </ToolbarBtn>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Color swatches */}
          <ToolbarGroup>
            {DRAW_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => onDrawColorChange?.(c.value)}
                title={c.label}
                className={[
                  "w-6 h-6 mx-0.5 border transition-all",
                  drawColor === c.value
                    ? "border-white scale-110"
                    : "border-border/50 hover:border-text-dim",
                ].join(" ")}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </ToolbarGroup>

          <ToolbarDivider />

          {/* Stroke width presets */}
          <ToolbarGroup>
            {DRAW_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => onDrawStrokeWidthChange?.(w)}
                title={`Stroke ${w}px`}
                className={[
                  "w-8 h-8 flex items-center justify-center transition-colors",
                  drawStrokeWidth === w
                    ? "text-accent bg-accent/10"
                    : "text-text-dim hover:text-text-primary hover:bg-bg-elevated",
                ].join(" ")}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: `${w * 2}px`,
                    height: `${w * 2}px`,
                    backgroundColor: "currentColor",
                  }}
                />
              </button>
            ))}
          </ToolbarGroup>
        </>
      )}

      {/* ── Right-side action buttons ────────────────────── */}
      <div className="ml-auto flex items-center gap-1">
        {/* Threat Condition */}
        <ThreatIndicator
          level={threatLevel as ThreatLevel}
          canEdit={canEdit}
          onChange={onThreatLevelChange ?? (() => {})}
        />

        <ToolbarDivider />

        {/* SITREP */}
        {onToggleSitrep && (
          <button
            onClick={onToggleSitrep}
            className={[
              "flex items-center gap-1.5 px-2.5 h-7 font-mono text-[11px] tracking-widest uppercase border transition-colors",
              sitrepOpen
                ? "border-amber/40 text-amber bg-amber/10"
                : "border-transparent text-text-dim hover:text-text-primary",
            ].join(" ")}
            title="Toggle SITREP panel"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="2" width="16" height="20" rx="1" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="16" y2="11" />
              <line x1="8" y1="15" x2="12" y2="15" />
            </svg>
            SITREP
          </button>
        )}

        {/* Export */}
        {onExportPNG && (
          <button
            onClick={onExportPNG}
            className="flex items-center gap-1.5 px-2.5 h-7 font-mono text-[11px] tracking-widest uppercase border border-transparent text-text-dim hover:text-text-primary transition-colors"
            title="Export map as PNG"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            EXPORT
          </button>
        )}

        <ToolbarDivider />

        <KeyboardShortcuts
          canEdit={canEdit}
          onDrawToolChange={onDrawToolChange as (tool: string) => void}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onFitView={onFitView}
          onToggleGrid={cycleGrid}
          onToggleSitrep={onToggleSitrep}
          onExportPNG={onExportPNG}
          onDeselect={onDeselect ?? (() => {})}
          onDeleteSelected={onDeleteSelected}
        />

        <span className="font-mono text-[10px] text-text-muted tracking-widest uppercase hidden md:block">
          UEE ATAK v7
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
        "w-8 h-8 flex items-center justify-center transition-colors",
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
