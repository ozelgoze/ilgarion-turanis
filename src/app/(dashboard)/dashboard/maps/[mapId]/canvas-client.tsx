"use client";

import { useRef, useState, useCallback } from "react";
import TacticalCanvas from "@/components/canvas/tactical-canvas";
import IconPalette from "@/components/canvas/icon-palette";
import SitrepPanel from "@/components/canvas/sitrep-panel";
import MarkerContextMenu from "@/components/canvas/marker-context-menu";
import type {
  GridType,
  TacticalCanvasRef,
  CreateDrawingPayload,
  MarkerContextMenuEvent,
} from "@/components/canvas/tactical-canvas";
import type { MarkerContextMenuData } from "@/components/canvas/marker-context-menu";
import type {
  TacticalMarker,
  MarkerType,
  MarkerAffiliation,
  MapDrawing,
  Briefing,
  TeamMemberWithProfile,
} from "@/types/database";
import {
  createMarker,
  updateMarkerPosition,
  updateMarker,
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
  teamMembers: TeamMemberWithProfile[];
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
  teamMembers,
}: CanvasClientProps) {
  const canvasRef = useRef<TacticalCanvasRef | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [sitrepOpen, setSitrepOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<MarkerContextMenuData | null>(null);

  // ── Subscribe to realtime marker + drawing changes + presence ──────────
  const { broadcast } = useMapRealtime({
    mapId,
    canvasRef,
    currentUserId,
    currentCallsign,
    onPresenceChange: setPresence,
  });

  // ── Build a lookup map: userId → callsign ─────────────────────────────
  const callsignMap = useRef(
    new Map(teamMembers.map((m) => [m.user_id, m.profiles.callsign]))
  ).current;

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
    if (result.marker) {
      broadcast({
        type: "marker_insert",
        marker: result.marker,
        sender: currentUserId,
      });
    }
    return result.marker?.id ?? "";
  }

  function handleMarkerMoved(markerId: string, x: number, y: number) {
    updateMarkerPosition(markerId, x, y);
    broadcast({
      type: "marker_update",
      id: markerId,
      x,
      y,
      sender: currentUserId,
    });
  }

  function handleMarkerDeleted(markerId: string) {
    deleteMarker(markerId);
    broadcast({
      type: "marker_delete",
      id: markerId,
      sender: currentUserId,
    });
  }

  // ── Marker context menu (double-click) ──────────────────────────────────

  const handleMarkerContextMenu = useCallback((event: MarkerContextMenuEvent) => {
    setCtxMenu({
      markerId: event.markerId,
      label: event.label,
      assignedTo: event.assignedTo,
      labelSize: event.labelSize,
      updatedAt: event.updatedAt,
      screenX: event.screenX,
      screenY: event.screenY,
    });
  }, []);

  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  async function handleMarkerSave(markerId: string, label: string, assignedTo: string | null, labelSize: number) {
    // Look up the updatedAt from the context menu data for optimistic locking
    const expectedUpdatedAt = ctxMenu?.updatedAt;
    const result = await updateMarker({
      markerId,
      label: label || null,
      assignedTo,
      labelSize,
      expectedUpdatedAt,
    });
    if (result.error && result.error.startsWith("CONFLICT")) {
      setConflictMsg(result.error);
      setTimeout(() => setConflictMsg(null), 4000);
      return;
    }
    if (result.marker) {
      const assignedCallsign = assignedTo ? callsignMap.get(assignedTo) ?? null : null;
      canvasRef.current?.updateMarkerMeta(markerId, label || null, assignedCallsign, labelSize);
      broadcast({
        type: "marker_update_meta",
        id: markerId,
        label: label || null,
        assignedCallsign,
        labelSize,
        sender: currentUserId,
      });
    }
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
    if (result.drawing) {
      broadcast({
        type: "drawing_insert",
        drawing: result.drawing,
        sender: currentUserId,
      });
    }
    return result.drawing?.id ?? "";
  }

  function handleDrawingDeleted(drawingId: string) {
    deleteDrawing(drawingId);
    broadcast({
      type: "drawing_delete",
      id: drawingId,
      sender: currentUserId,
    });
  }

  // ── Export to PNG ──────────────────────────────────────────────────────
  function handleExportPNG() {
    const dataUrl = canvasRef.current?.exportPNG();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `tactical-map-${mapId.slice(0, 8)}.png`;
    link.href = dataUrl;
    link.click();
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
        onMarkerContextMenu={handleMarkerContextMenu}
        onDrawingCreate={handleDrawingCreate}
        onDrawingDeleted={handleDrawingDeleted}
        scaleFactor={scaleFactor}
        onExportPNG={handleExportPNG}
        onToggleSitrep={() => setSitrepOpen((v) => !v)}
        sitrepOpen={sitrepOpen}
      />

      {/* ── Presence Overlay (center bottom) ──────── */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-20 pointer-events-none">
        <div className="bg-bg-surface/90 border border-border px-3 py-2 flex items-center gap-3 backdrop-blur-sm">
          <span className="font-mono text-[10px] tracking-widest text-text-muted uppercase whitespace-nowrap">
            Viewers ({presence.length || 1})
          </span>
          <div className="w-px h-3 bg-border" />

          {/* Self */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
            <span className="font-mono text-[11px] tracking-widest text-accent uppercase">
              {currentCallsign} <span className="text-text-muted">· YOU</span>
            </span>
          </div>

          {/* Others */}
          {others.map((u) => (
            <div key={u.user_id} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber animate-pulse shrink-0" />
              <span className="font-mono text-[11px] tracking-widest text-text-dim uppercase">
                {u.callsign}
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* ── SITREP Side Panel ────────────────────────────────────── */}
      <SitrepPanel
        briefing={latestBriefing}
        canEdit={canEdit}
        visible={sitrepOpen}
        onClose={() => setSitrepOpen(false)}
      />

      {/* ── Marker Context Menu ──────────────────────────────────── */}
      <MarkerContextMenu
        data={ctxMenu}
        teamMembers={teamMembers}
        onClose={() => setCtxMenu(null)}
        onSave={handleMarkerSave}
        onDelete={(id) => {
          handleMarkerDeleted(id);
          canvasRef.current?.removeMarker(id);
        }}
      />

      {/* ── Conflict Toast ──────────────────────────────────────── */}
      {conflictMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] bg-red-900/90 border border-red-500/50 px-4 py-2.5 backdrop-blur-sm">
          <p className="font-mono text-[11px] tracking-widest text-red-300 uppercase">
            {conflictMsg}
          </p>
        </div>
      )}
    </div>
  );
}
