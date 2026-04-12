"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ImageEditorProps {
  file: File;
  onConfirm: (editedFile: File) => void;
  onCancel: () => void;
}

/**
 * Lightweight image editor for crop & rotate before upload.
 * Uses native Canvas API — no dependencies.
 */
export default function ImageEditor({ file, onConfirm, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Crop state
  const [cropActive, setCropActive] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; dragging: boolean }>({
    startX: 0, startY: 0, dragging: false,
  });

  // Load image from file
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setLoaded(true);
    };
    img.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(img.src);
  }, [file]);

  // Draw image with current rotation + crop overlay
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Determine display dimensions (fit within container)
    const maxW = canvas.parentElement?.clientWidth ?? 500;
    const maxH = 360;

    // Rotated dimensions
    const isRotated = rotation === 90 || rotation === 270;
    const srcW = isRotated ? img.height : img.width;
    const srcH = isRotated ? img.width : img.height;

    const scale = Math.min(maxW / srcW, maxH / srcH, 1);
    const displayW = Math.round(srcW * scale);
    const displayH = Math.round(srcH * scale);

    canvas.width = displayW;
    canvas.height = displayH;

    ctx.clearRect(0, 0, displayW, displayH);
    ctx.save();

    // Rotate around center
    ctx.translate(displayW / 2, displayH / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const drawW = isRotated ? displayH : displayW;
    const drawH = isRotated ? displayW : displayH;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw crop overlay
    if (cropRect) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      // Top
      ctx.fillRect(0, 0, displayW, cropRect.y);
      // Bottom
      ctx.fillRect(0, cropRect.y + cropRect.h, displayW, displayH - cropRect.y - cropRect.h);
      // Left
      ctx.fillRect(0, cropRect.y, cropRect.x, cropRect.h);
      // Right
      ctx.fillRect(cropRect.x + cropRect.w, cropRect.y, displayW - cropRect.x - cropRect.w, cropRect.h);

      // Crop border
      ctx.strokeStyle = "#F0A500";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.setLineDash([]);
    }
  }, [rotation, cropRect]);

  useEffect(() => {
    if (loaded) draw();
  }, [loaded, draw]);

  function handleRotate(deg: number) {
    setRotation((r) => (r + deg + 360) % 360);
    setCropRect(null);
  }

  // Crop mouse handlers
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!cropActive) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragRef.current = { startX: x, startY: y, dragging: true };
    setCropRect({ x, y, w: 0, h: 0 });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragRef.current.dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const sx = dragRef.current.startX;
    const sy = dragRef.current.startY;
    setCropRect({
      x: Math.min(sx, x),
      y: Math.min(sy, y),
      w: Math.abs(x - sx),
      h: Math.abs(y - sy),
    });
  }

  function handleMouseUp() {
    dragRef.current.dragging = false;
    // Remove tiny crops (accidental clicks)
    if (cropRect && (cropRect.w < 10 || cropRect.h < 10)) {
      setCropRect(null);
    }
  }

  // Apply edits and return new File
  async function handleConfirm() {
    const img = imgRef.current;
    if (!img) return;

    const offscreen = document.createElement("canvas");
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    const isRotated = rotation === 90 || rotation === 270;
    const fullW = isRotated ? img.height : img.width;
    const fullH = isRotated ? img.width : img.height;

    // If crop is set, calculate the crop in original image coordinates
    const displayCanvas = canvasRef.current!;
    const scaleX = fullW / displayCanvas.width;
    const scaleY = fullH / displayCanvas.height;

    let outW = fullW;
    let outH = fullH;
    let cropSrcX = 0;
    let cropSrcY = 0;

    if (cropRect && cropRect.w > 10 && cropRect.h > 10) {
      outW = Math.round(cropRect.w * scaleX);
      outH = Math.round(cropRect.h * scaleY);
      cropSrcX = Math.round(cropRect.x * scaleX);
      cropSrcY = Math.round(cropRect.y * scaleY);
    }

    offscreen.width = outW;
    offscreen.height = outH;

    // Draw rotated full image to a temp canvas first
    const temp = document.createElement("canvas");
    temp.width = fullW;
    temp.height = fullH;
    const tCtx = temp.getContext("2d")!;
    tCtx.translate(fullW / 2, fullH / 2);
    tCtx.rotate((rotation * Math.PI) / 180);
    const drawW = isRotated ? fullH : fullW;
    const drawH = isRotated ? fullW : fullH;
    tCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    // Copy the crop region
    ctx.drawImage(temp, cropSrcX, cropSrcY, outW, outH, 0, 0, outW, outH);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve) => {
      offscreen.toBlob(
        (b) => resolve(b!),
        file.type === "image/png" ? "image/png" : "image/jpeg",
        0.92
      );
    });

    const editedFile = new File([blob], file.name, { type: blob.type });
    onConfirm(editedFile);
  }

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div className="flex items-center justify-center bg-bg-deep border border-border p-2 min-h-[200px]">
        {loaded ? (
          <canvas
            ref={canvasRef}
            className={cropActive ? "cursor-crosshair" : "cursor-default"}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        ) : (
          <span className="font-mono text-[10px] text-text-muted tracking-widest">
            LOADING PREVIEW...
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleRotate(-90)}
          className="px-2 py-1.5 border border-border font-mono text-[9px] tracking-widest text-text-muted hover:text-text-dim transition-colors uppercase"
          title="Rotate left"
        >
          ↺ 90°
        </button>
        <button
          type="button"
          onClick={() => handleRotate(90)}
          className="px-2 py-1.5 border border-border font-mono text-[9px] tracking-widest text-text-muted hover:text-text-dim transition-colors uppercase"
          title="Rotate right"
        >
          ↻ 90°
        </button>

        <div className="w-px h-5 bg-border" />

        <button
          type="button"
          onClick={() => {
            setCropActive(!cropActive);
            if (cropActive) setCropRect(null);
          }}
          className={[
            "px-2 py-1.5 border font-mono text-[9px] tracking-widest uppercase transition-colors",
            cropActive
              ? "border-amber/40 text-amber bg-amber/10"
              : "border-border text-text-muted hover:text-text-dim",
          ].join(" ")}
        >
          {cropActive ? "✓ CROPPING" : "CROP"}
        </button>

        {cropRect && (
          <button
            type="button"
            onClick={() => setCropRect(null)}
            className="px-2 py-1.5 border border-border font-mono text-[9px] tracking-widest text-text-muted hover:text-text-dim transition-colors uppercase"
          >
            RESET CROP
          </button>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-border font-mono text-[9px] tracking-widest text-text-muted hover:text-text-dim transition-colors uppercase"
        >
          CANCEL
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-3 py-1.5 border border-amber/40 bg-amber/10 font-mono text-[9px] tracking-widest text-amber hover:bg-amber/20 transition-colors uppercase"
        >
          APPLY
        </button>
      </div>

      {/* Hints */}
      <p className="font-mono text-[8px] text-text-muted tracking-widest text-center">
        {cropActive
          ? "CLICK+DRAG TO SELECT CROP AREA · APPLY TO CONFIRM"
          : rotation !== 0
          ? `ROTATED ${rotation}° · APPLY TO CONFIRM`
          : "ROTATE OR CROP THE IMAGE BEFORE UPLOADING"}
      </p>
    </div>
  );
}
