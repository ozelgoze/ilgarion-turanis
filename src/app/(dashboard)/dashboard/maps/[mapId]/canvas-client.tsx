"use client";

import { useRef, useState } from "react";
import TacticalCanvas from "@/components/canvas/tactical-canvas";
import IconPalette from "@/components/canvas/icon-palette";
import type {
  GridType,
  TacticalCanvasRef,
} from "@/components/canvas/tactical-canvas";
import type {
  TacticalMarker,
  MarkerType,
  MarkerAffiliation,
} from "@/types/database";
import {
  createMarker,
  updateMarkerPosition,
  deleteMarker,
} from "@/app/actions/markers";
import { useMapRealtime, type PresenceUser } from "@/hooks/use-map-realtime";

interface CanvasClientProps {
  mapId: string;
  imageUrl: string;
  initialGridType: GridType;
  initialGridSize: number;
  initialMarkers: TacticalMarker[];
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
  canEdit,
  currentUserId,
  currentCallsign,
}: CanvasClientProps) {
  const canvasRef = useRef<TacticalCanvasRef | null>(null);
  const [presence, setPresence] = useState<PresenceUser[]>([]);

  // ── Subscribe to realtime marker changes + presence ─────────────────────
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

  // ── Other viewers (exclude self) ─────────────────────────────────────────
  const others = presence.filter((u) => u.user_id !== currentUserId);

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <TacticalCanvas
        ref={canvasRef}
        mapId={mapId}
        imageUrl={imageUrl}
        initialGridType={initialGridType}
        initialGridSize={initialGridSize}
        initialMarkers={initialMarkers}
        canEdit={canEdit}
        palette={<IconPalette visible={canEdit} />}
        onMarkerDrop={handleMarkerDrop}
        onMarkerMoved={handleMarkerMoved}
        onMarkerDeleted={handleMarkerDeleted}
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
    </div>
  );
}
