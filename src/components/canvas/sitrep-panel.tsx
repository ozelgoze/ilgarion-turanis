"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { updateBriefing } from "@/app/actions/briefings";
import type { Briefing } from "@/types/database";

interface SitrepPanelProps {
  briefing: Briefing | null;
  canEdit: boolean;
  visible: boolean;
  onClose: () => void;
}

export default function SitrepPanel({
  briefing,
  canEdit,
  visible,
  onClose,
}: SitrepPanelProps) {
  const [content, setContent] = useState(briefing?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset content when briefing changes
  useEffect(() => {
    setContent(briefing?.content ?? "");
    setSaved(false);
  }, [briefing?.id, briefing?.content]);

  const scheduleSave = useCallback(() => {
    if (!canEdit || !briefing) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaved(false);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      await updateBriefing({
        briefingId: briefing.id,
        content: content || null,
      });
      setSaving(false);
      setSaved(true);
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, briefing?.id, content]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="w-80 shrink-0 flex flex-col border-l border-border bg-bg-surface z-10">
      {/* Header */}
      <div className="h-9 shrink-0 border-b border-border flex items-center px-3 gap-2">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-amber shrink-0"
        >
          <rect x="4" y="2" width="16" height="20" rx="1" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="16" y2="11" />
          <line x1="8" y1="15" x2="12" y2="15" />
        </svg>
        <span className="font-mono text-[10px] tracking-widest text-amber uppercase">
          SITREP
        </span>

        <div className="ml-auto flex items-center gap-2">
          {saving && (
            <span className="font-mono text-[8px] text-text-muted tracking-widest animate-pulse">
              SAVING
            </span>
          )}
          {saved && !saving && (
            <span className="font-mono text-[8px] text-accent tracking-widest">
              SAVED
            </span>
          )}
          <button
            onClick={onClose}
            className="font-mono text-[9px] text-text-muted hover:text-text-dim transition-colors"
            title="Close SITREP panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      {briefing ? (
        <div className="flex-1 overflow-auto">
          {canEdit ? (
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                scheduleSave();
              }}
              placeholder="Operational notes, waypoints, unit assignments...&#10;&#10;Auto-saves after 2s."
              className="w-full h-full resize-none bg-transparent p-3 font-mono text-[11px] text-text-dim leading-relaxed tracking-wide outline-none placeholder:text-text-muted/40"
            />
          ) : (
            <div className="p-3">
              {content ? (
                <pre className="font-mono text-[11px] text-text-dim leading-relaxed tracking-wide whitespace-pre-wrap">
                  {content}
                </pre>
              ) : (
                <p className="font-mono text-[9px] text-text-muted tracking-widest uppercase">
                  No SITREP notes yet.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="font-mono text-[10px] text-text-muted tracking-widest uppercase mb-1">
              No Briefing Linked
            </p>
            <p className="font-mono text-[9px] text-text-muted/60 tracking-widest">
              Create a briefing for this team to enable SITREP notes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
