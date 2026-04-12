"use client";

import { useRef, useState } from "react";
import TacticalCanvas from "@/components/canvas/tactical-canvas";
import IconPalette from "@/components/canvas/icon-palette";
import SitrepPanel from "@/components/canvas/sitrep-panel";
import type {
  GridType,
  TacticalCanvasRef,
  CreateDrawingPayload,
} from "@/components/canvas/tactical-canvas";
import type {
  TacticalMarker,
  MarkerType,
  MarkerAffiliation,
  MapDrawing,
  Briefing,
} from "@/types/database";
import {
  createMarker,
  updateMarkerPosition,
  deleteMarker,
} from "@/app/actions/markers";
import {
  createDrawing,
  deleteDrawing,
} from "@/app/actions/drawings";
import { useMapRealtime, type PresenceUser } from "@/hooks/use-map-realtime";

interface CanvasClientProps {
  mapId: string;
  imageUrl: string;
  initialGridType: GridType;
  initialGridSize: number;
  initialMarkers: TacticalMarker[];
  initialDrawings: MapDrawing[];
  latestBriefing: Briefing | null;
  scaleFactor: number;
  canEdit: boolean;
  currentUserId: string;
  currentCallsign: string;
}

export default function CanvasClient({
  mapId,
  imageUrl,
  initialGridType,
  initialGridSize,
  initialMarkers,
  initialDrawings,
  latestBriefing,
  scaleFactor,
  canEdit,
  currentUserId,
  currentCallsign,
}: CanvasClientProps) {
  const canvasRef = useRef<TacticalCanvasRef | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [sitrepOpen, setSitrepOpen] = useState(false);

  // ── Subscribe to realtime marker + drawing changes + presence ──────────
  useMapRealtime({
    mapId,
    canvasRef,
    currentUserId,
    currentCallsign,
    onPresenceChange: setPresence,
  });

  // ── Marker callbacks wired to server actions ─────────────────────────────

  async function handleMarkerDrop(
    type: MarkerType,
    affiliation: MarkerAffiliation,
    x: number,
    y: number
  ): Promise<string> {
    const result = await createMarker({
      mapId,
      markerType: type,
      affiliation,
      x,
      y,
    });
    return result.marker?.id ?? "";
  }

  function handleMarkerMoved(markerId: string, x: number, y: number) {
    updateMarkerPosition(markerId, x, y);
  }

  function handleMarkerDeleted(markerId: string) {
    deleteMarker(markerId);
  }

  // ── Drawing callbacks wired to server actions ────────────────────────────

  async function handleDrawingCreate(
    payload: CreateDrawingPayload
  ): Promise<string> {
    const result = await createDrawing({
      mapId,
      drawingType: payload.drawingType,
      points: payload.points,
      strokeColor: payload.strokeColor,
      strokeWidth: payload.strokeWidth,
    });
    return result.drawing?.id ?? "";
  }

  function handleDrawingDeleted(drawingId: string) {
    deleteDrawing(drawingId);
  }

  // ── Other viewers (exclude self) ─────────────────────────────────────────
  const others = presence.filter((u) => u.user_id !== currentUserId);

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Main canvas area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
      <TacticalCanvas
        ref={canvasRef}
        mapId={mapId}
        imageUrl={imageUrl}
        initialGridType={initialGridType}
        initialGridSize={initialGridSize}
        initialMarkers={initialMarkers}
        initialDrawings={initialDrawings}
        canEdit={canEdit}
        palette={<IconPalette visible={canEdit} />}
        onMarkerDrop={handleMarkerDrop}
        onMarkerMoved={handleMarkerMoved}
        onMarkerDeleted={handleMarkerDeleted}
        onDrawingCreate={handleDrawingCreate}
        onDrawingDeleted={handleDrawingDeleted}
        scaleFactor={scaleFactor}
      />

      {/* ── Presence Overlay ─────────────────────────────────────── */}
      <div className="absolute right-2 top-12 z-20 pointer-events-none">
        <div className="bg-bg-surface/90 border border-border px-2 py-1.5 flex flex-col gap-1 min-w-[120px] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
            <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase">
              Viewers
            </span>
            <span className="font-mono text-[8px] tracking-widest text-accent">
              {presence.length || 1}
            </span>
          </div>

          {/* Self */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            <span className="font-mono text-[9px] tracking-widest text-accent uppercase truncate">
              {currentCallsign} <span className="text-text-muted">· YOU</span>
            </span>
          </div>

          {/* Others */}
          {others.map((u) => (
            <div key={u.user_id} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse shrink-0" />
              <span className="font-mono text-[9px] tracking-widest text-text-dim uppercase truncate">
                {u.callsign}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SITREP Toggle Button ─────────────────────────────────── */}
      <button
        onClick={() => setSitrepOpen((v) => !v)}
        className={[
          "absolute left-2 top-12 z-20 flex items-center gap-1.5 px-2 py-1.5 font-mono text-[9px] tracking-widest uppercase border transition-colors backdrop-blur-sm",
          sitrepOpen
            ? "border-amber/40 text-amber bg-amber/10"
            : "border-border text-text-muted hover:text-text-dim bg-bg-surface/90",
        ].join(" ")}
        title="Toggle SITREP panel"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="4" y="2" width="16" height="20" rx="1" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="16" y2="11" />
          <line x1="8" y1="15" x2="12" y2="15" />
        </svg>
        SITREP
      </button>
      </div>

      {/* ── SITREP Side Panel ────────────────────────────────────── */}
      <SitrepPanel
        briefing={latestBriefing}
        canEdit={canEdit}
        visible={sitrepOpen}
        onClose={() => setSitrepOpen(false)}
      />
    </div>
  );
}
