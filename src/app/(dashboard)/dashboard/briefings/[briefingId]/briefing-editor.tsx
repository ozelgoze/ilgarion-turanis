"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { updateBriefing, deleteBriefing, getBriefing } from "@/app/actions/briefings";
import { useRouter } from "next/navigation";
import type { Briefing } from "@/types/database";
import MarkdownRenderer from "@/components/markdown-renderer";
import { createClient } from "@/utils/supabase/client";

interface BriefingEditorProps {
  briefing: Briefing & { profiles?: { callsign: string } };
  canEdit: boolean;
}

export default function BriefingEditor({
  briefing,
  canEdit,
}: BriefingEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(briefing.title);
  const [content, setContent] = useState(briefing.content ?? "");
  const [embedUrl, setEmbedUrl] = useState(briefing.embed_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "embed">(
    briefing.embed_url ? "embed" : "notes"
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // ── Real-time: broadcast edits to other viewers ──────────────────────
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`briefing:${briefing.id}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "briefing_update" }, async () => {
        // Another user saved — fetch latest data
        const updated = await getBriefing(briefing.id);
        if (updated) {
          setTitle(updated.title);
          setContent(updated.content ?? "");
          setEmbedUrl(updated.embed_url ?? "");
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [briefing.id]);

  function broadcastBriefingChange() {
    channelRef.current?.send({
      type: "broadcast",
      event: "briefing_update",
      payload: {},
    });
  }

  // ── Auto-save debounce (2s after last keystroke) ──────────────────────
  const scheduleSave = useCallback(() => {
    if (!canEdit) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaved(false);
    saveTimerRef.current = setTimeout(() => {
      performSave();
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit]);

  async function performSave() {
    setSaving(true);
    setError(null);
    const result = await updateBriefing({
      briefingId: briefing.id,
      title: title.trim() || briefing.title,
      content: content || null,
      embedUrl: embedUrl.trim() || null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      broadcastBriefingChange();
    }
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  async function handleDelete() {
    if (!confirm("Delete this briefing permanently?")) return;
    setDeleting(true);
    const result = await deleteBriefing(briefing.id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
    } else {
      router.push(`/dashboard/teams/${briefing.team_id}`);
    }
  }

  // Sanitize embed URL for iframe src
  const safeEmbedUrl = embedUrl.trim().startsWith("https://")
    ? embedUrl.trim()
    : "";

  const tabs: { key: "notes" | "embed"; label: string }[] = [
    { key: "notes", label: "SITREP / NOTES" },
    { key: "embed", label: "EMBED DOC" },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="h-9 shrink-0 bg-bg-surface border-b border-border flex items-center px-3 gap-2 z-10">
        {/* Tab Buttons */}
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              "px-3 h-7 font-mono text-[10px] tracking-widest uppercase border transition-colors",
              activeTab === tab.key
                ? "border-accent/40 text-accent bg-accent/10"
                : "border-transparent text-text-dim hover:text-text-primary",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}

        {/* Save status */}
        <div className="ml-auto flex items-center gap-3">
          {saving && (
            <span className="font-mono text-[9px] text-text-muted tracking-widest animate-pulse">
              SAVING...
            </span>
          )}
          {saved && !saving && (
            <span className="font-mono text-[9px] text-accent tracking-widest">
              SAVED
            </span>
          )}
          {error && (
            <span className="font-mono text-[9px] text-danger tracking-widest">
              {error}
            </span>
          )}

          {canEdit && (
            <>
              <button
                onClick={() => performSave()}
                disabled={saving}
                className="font-mono text-[9px] tracking-widest text-text-dim hover:text-accent transition-colors uppercase disabled:opacity-40"
              >
                SAVE NOW
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="font-mono text-[9px] tracking-widest text-text-muted hover:text-danger transition-colors uppercase disabled:opacity-40"
              >
                {deleting ? "DELETING..." : "DELETE"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Panels */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === "notes" ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Title field */}
            {canEdit ? (
              <div className="px-6 pt-5 pb-3 border-b border-border bg-bg-surface">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    scheduleSave();
                  }}
                  className="w-full bg-transparent font-mono text-lg font-bold text-text-bright tracking-wide uppercase outline-none placeholder:text-text-muted/50"
                  placeholder="BRIEFING TITLE"
                />
              </div>
            ) : (
              <div className="px-6 pt-5 pb-3 border-b border-border bg-bg-surface">
                <h1 className="font-mono text-lg font-bold text-text-bright tracking-wide uppercase">
                  {title}
                </h1>
              </div>
            )}

            {/* Markdown / text area */}
            <div className="flex-1 overflow-auto">
              {canEdit ? (
                <textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    scheduleSave();
                  }}
                  placeholder="Enter SITREP notes, mission details, waypoints, or operational intel...&#10;&#10;Supports markdown: # Headers, **bold**, *italic*, `code`, - lists, --- rules"
                  className="w-full h-full resize-none bg-bg-void p-6 font-mono text-sm text-text-dim leading-relaxed tracking-wide outline-none placeholder:text-text-muted/40"
                />
              ) : (
                <div className="p-6 bg-bg-void h-full overflow-auto">
                  {content ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="font-mono text-[10px] text-text-muted tracking-widest uppercase">
                      No content yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Embed Tab */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Embed URL field (editors only) */}
            {canEdit && (
              <div className="px-6 py-3 border-b border-border bg-bg-surface flex items-center gap-3">
                <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase shrink-0">
                  URL
                </span>
                <input
                  type="url"
                  value={embedUrl}
                  onChange={(e) => {
                    setEmbedUrl(e.target.value);
                    scheduleSave();
                  }}
                  placeholder="https://docs.google.com/presentation/d/.../embed"
                  className="flex-1 bg-transparent font-mono text-[11px] text-text-dim tracking-wide outline-none placeholder:text-text-muted/40"
                />
              </div>
            )}

            {/* Iframe */}
            <div className="flex-1 bg-bg-void relative">
              {safeEmbedUrl ? (
                <iframe
                  src={safeEmbedUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  loading="lazy"
                  title="Embedded briefing document"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 40 40"
                      fill="none"
                      className="text-text-muted mx-auto mb-3 opacity-30"
                    >
                      <rect
                        x="4"
                        y="6"
                        width="32"
                        height="28"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="4"
                        y1="14"
                        x2="36"
                        y2="14"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                      <circle
                        cx="20"
                        cy="24"
                        r="5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <line
                        x1="18"
                        y1="24"
                        x2="23"
                        y2="24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-1">
                      No Document Embedded
                    </p>
                    <p className="font-mono text-[10px] text-text-muted tracking-widest">
                      {canEdit
                        ? "Paste a published Google Docs or Slides URL above."
                        : "No embed URL has been configured for this briefing."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
