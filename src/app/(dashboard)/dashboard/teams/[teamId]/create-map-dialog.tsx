"use client";

import { useState, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { createMapRecord } from "@/app/actions/maps";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/tiff"];
const MAX_FILE_MB = 50;

type GridType = "none" | "square" | "hex";

interface CreateMapDialogProps {
  teamId: string;
}

export default function CreateMapDialog({ teamId }: CreateMapDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gridType, setGridType] = useState<GridType>("square");
  const [gridSize, setGridSize] = useState(50);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setName("");
    setGridType("square");
    setGridSize(50);
    setFile(null);
    setUploading(false);
    setProgress(0);
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("UNSUPPORTED FORMAT — USE JPEG, PNG, WEBP, OR TIFF.");
      return;
    }
    if (selected.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`FILE TOO LARGE — MAX ${MAX_FILE_MB}MB.`);
      return;
    }

    setError(null);
    setFile(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim()) return;

    setUploading(true);
    setError(null);
    setProgress(10);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${teamId}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();

    // Upload to Supabase Storage
    setProgress(30);
    const { error: uploadError } = await supabase.storage
      .from("map-assets")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      setError("UPLOAD FAILED: " + uploadError.message.toUpperCase());
      setUploading(false);
      setProgress(0);
      return;
    }

    setProgress(70);

    // Create DB record
    const result = await createMapRecord({
      teamId,
      name: name.trim(),
      imagePath: path,
      gridType,
      gridSize,
    });

    if (result.error) {
      // Rollback storage upload
      await supabase.storage.from("map-assets").remove([path]);
      setError(result.error);
      setUploading(false);
      setProgress(0);
      return;
    }

    setProgress(100);
    setOpen(false);
    reset();
    router.push(`/dashboard/maps/${result.mapId}`);
  }

  const gridOptions: { value: GridType; label: string }[] = [
    { value: "none", label: "NONE" },
    { value: "square", label: "SQUARE" },
    { value: "hex", label: "HEX" },
  ];

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button className="mtc-btn-primary text-sm">+ UPLOAD MAP</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          onEscapeKeyDown={() => !uploading && setOpen(false)}
          onPointerDownOutside={() => !uploading && setOpen(false)}
        >
          <div className="mtc-panel bg-bg-surface p-8">
            {/* Header */}
            <div className="border-b border-border pb-4 mb-6 flex items-center justify-between">
              <Dialog.Title className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
                Upload Tactical Map
              </Dialog.Title>
              <Dialog.Close
                disabled={uploading}
                className="font-mono text-[10px] text-text-muted hover:text-danger transition-colors disabled:opacity-40"
              >
                ✕ CLOSE
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Map Name */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
                  Map Designation
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={64}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. EXTRACTION ZONE ALPHA"
                  className="mtc-input font-mono text-sm uppercase"
                  disabled={uploading}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
                  Map Image{" "}
                  <span className="text-text-muted">(JPG, PNG, WEBP — max {MAX_FILE_MB}MB)</span>
                </label>
                <div
                  className={[
                    "border border-dashed p-6 text-center cursor-pointer transition-colors",
                    file
                      ? "border-accent/40 bg-accent/5"
                      : "border-border hover:border-border-bright",
                  ].join(" ")}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  {file ? (
                    <div>
                      <p className="font-mono text-xs text-accent tracking-widest truncate">
                        {file.name}
                      </p>
                      <p className="font-mono text-[9px] text-text-muted mt-1">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted mx-auto mb-2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p className="font-mono text-[10px] text-text-muted tracking-widest uppercase">
                        Click to select image
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </div>

              {/* Grid Type */}
              <div className="space-y-2">
                <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
                  Grid Overlay
                </label>
                <div className="flex gap-2">
                  {gridOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={uploading}
                      onClick={() => setGridType(opt.value)}
                      className={[
                        "flex-1 py-2 font-mono text-[10px] tracking-widest uppercase border transition-colors",
                        gridType === opt.value
                          ? "border-accent/50 text-accent bg-accent/10"
                          : "border-border text-text-muted hover:border-border-bright",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Size (only if grid enabled) */}
              {gridType !== "none" && (
                <div className="space-y-1">
                  <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
                    Grid Cell Size{" "}
                    <span className="text-text-muted">({gridSize}px)</span>
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={120}
                    step={5}
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    disabled={uploading}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-text-muted">
                    <span>20px</span>
                    <span>120px</span>
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-1">
                  <div className="h-0.5 bg-bg-elevated overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="font-mono text-[10px] text-text-dim tracking-widest text-center">
                    {progress < 70 ? "UPLOADING IMAGE..." : "REGISTERING MAP..."}
                  </p>
                </div>
              )}

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
                  disabled={uploading || !file || !name.trim()}
                  className="mtc-btn-primary"
                >
                  {uploading ? "UPLOADING..." : "UPLOAD & OPEN"}
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    disabled={uploading}
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
