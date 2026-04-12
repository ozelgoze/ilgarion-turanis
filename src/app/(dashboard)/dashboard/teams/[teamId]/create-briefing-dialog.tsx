"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { createBriefing } from "@/app/actions/briefings";

interface CreateBriefingDialogProps {
  teamId: string;
}

export default function CreateBriefingDialog({
  teamId,
}: CreateBriefingDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function reset() {
    setTitle("");
    setEmbedUrl("");
    setSubmitting(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    const result = await createBriefing({
      teamId,
      title: title.trim(),
      embedUrl: embedUrl.trim() || null,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setOpen(false);
    reset();
    if (result.briefing) {
      router.push(`/dashboard/briefings/${result.briefing.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button className="mtc-btn-primary text-sm">+ NEW BRIEFING</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          onEscapeKeyDown={() => !submitting && setOpen(false)}
          onPointerDownOutside={() => !submitting && setOpen(false)}
        >
          <div className="mtc-panel bg-bg-surface p-8">
            {/* Header */}
            <div className="border-b border-border pb-4 mb-6 flex items-center justify-between">
              <Dialog.Title className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
                Create Briefing
              </Dialog.Title>
              <Dialog.Close
                disabled={submitting}
                className="font-mono text-[10px] text-text-muted hover:text-danger transition-colors disabled:opacity-40"
              >
                ✕ CLOSE
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
                  Briefing Title
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={128}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. OP THUNDERSTRIKE — PHASE 2"
                  className="mtc-input font-mono text-sm uppercase"
                  disabled={submitting}
                />
              </div>

              {/* Embed URL (optional) */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
                  Embed URL{" "}
                  <span className="text-text-muted">(Google Docs / Slides — Optional)</span>
                </label>
                <input
                  type="url"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://docs.google.com/presentation/d/..."
                  className="mtc-input font-mono text-[11px]"
                  disabled={submitting}
                />
                <p className="font-mono text-[9px] text-text-muted tracking-widest">
                  Paste a published Google Docs, Slides, or other embeddable URL.
                  You can also add this later.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="border border-danger/30 bg-danger/5 px-3 py-2">
                  <p className="font-mono text-[11px] text-danger tracking-widest">
                    ⚠ {error}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="mtc-btn-primary"
                >
                  {submitting ? "CREATING..." : "CREATE BRIEFING"}
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    disabled={submitting}
                    className="mtc-btn-ghost"
                  >
                    CANCEL
                  </button>
                </Dialog.Close>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
