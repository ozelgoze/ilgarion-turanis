"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ShortcutEntry {
  keys: string[];
  description: string;
  editOnly?: boolean;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: ["V"], description: "Select / Move tool", editOnly: true },
  { keys: ["L"], description: "Line tool", editOnly: true },
  { keys: ["A"], description: "Arrow tool", editOnly: true },
  { keys: ["R"], description: "Rectangle tool", editOnly: true },
  { keys: ["C"], description: "Circle tool", editOnly: true },
  { keys: ["M"], description: "Measure tool", editOnly: true },
  { keys: ["Del"], description: "Delete selected", editOnly: true },
  { keys: ["Esc"], description: "Deselect / close panel" },
  { keys: ["+", "="], description: "Zoom in" },
  { keys: ["-"], description: "Zoom out" },
  { keys: ["0"], description: "Fit to view" },
  { keys: ["G"], description: "Toggle grid" },
  { keys: ["S"], description: "Toggle SITREP panel" },
  { keys: ["E"], description: "Export PNG" },
  { keys: ["?"], description: "Show this overlay" },
];

interface KeyboardShortcutsProps {
  canEdit: boolean;
  onDrawToolChange?: (tool: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onToggleGrid: () => void;
  onToggleSitrep?: () => void;
  onExportPNG?: () => void;
  onDeselect: () => void;
  onDeleteSelected?: () => void;
}

export default function KeyboardShortcuts({
  canEdit,
  onDrawToolChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleGrid,
  onToggleSitrep,
  onExportPNG,
  onDeselect,
  onDeleteSelected,
}: KeyboardShortcutsProps) {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case "?":
          setOpen((v) => !v);
          break;
        case "escape":
          if (open) {
            setOpen(false);
          } else {
            onDeselect();
          }
          break;
        case "v":
          if (canEdit) onDrawToolChange?.("select");
          break;
        case "l":
          if (canEdit) onDrawToolChange?.("line");
          break;
        case "a":
          if (canEdit) onDrawToolChange?.("arrow");
          break;
        case "r":
          if (canEdit) onDrawToolChange?.("rectangle");
          break;
        case "c":
          if (canEdit) onDrawToolChange?.("circle");
          break;
        case "m":
          if (canEdit) onDrawToolChange?.("measure");
          break;
        case "+":
        case "=":
          onZoomIn();
          break;
        case "-":
          onZoomOut();
          break;
        case "0":
          onFitView();
          break;
        case "g":
          onToggleGrid();
          break;
        case "s":
          onToggleSitrep?.();
          break;
        case "e":
          onExportPNG?.();
          break;
        case "delete":
        case "backspace":
          if (canEdit) onDeleteSelected?.();
          break;
      }
    },
    [
      canEdit,
      open,
      onDrawToolChange,
      onZoomIn,
      onZoomOut,
      onFitView,
      onToggleGrid,
      onToggleSitrep,
      onExportPNG,
      onDeselect,
      onDeleteSelected,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const visibleShortcuts = canEdit
    ? SHORTCUTS
    : SHORTCUTS.filter((s) => !s.editOnly);

  return (
    <>
      {/* Toolbar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 flex items-center justify-center text-text-dim hover:text-accent hover:bg-bg-elevated transition-colors"
        title="Keyboard shortcuts (?)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="6" width="20" height="12" rx="1" />
          <line x1="6" y1="10" x2="6" y2="10.01" />
          <line x1="10" y1="10" x2="10" y2="10.01" />
          <line x1="14" y1="10" x2="14" y2="10.01" />
          <line x1="18" y1="10" x2="18" y2="10.01" />
          <line x1="8" y1="14" x2="16" y2="14" />
        </svg>
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 z-[9999]"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-[380px] max-h-[80vh] overflow-auto bg-bg-surface border border-border"
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-accent" />
                  <h2 className="font-mono text-xs tracking-[0.2em] text-text-bright uppercase">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="font-mono text-[10px] tracking-widest text-text-muted hover:text-text-primary transition-colors"
                >
                  ESC
                </button>
              </div>

              {/* Shortcut list */}
              <div className="p-3">
                {visibleShortcuts.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 hover:bg-bg-elevated transition-colors"
                  >
                    <span className="font-mono text-[11px] text-text-dim tracking-wide">
                      {s.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="min-w-[24px] h-6 flex items-center justify-center px-1.5 bg-bg-primary border border-border font-mono text-[10px] text-accent tracking-widest uppercase"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border">
                <p className="font-mono text-[9px] text-text-muted tracking-widest text-center uppercase">
                  Press ? to toggle this overlay
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
