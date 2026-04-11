"use client";

import TacticalCanvas from "@/components/canvas/tactical-canvas";
import IconPalette from "@/components/canvas/icon-palette";
import type { GridType } from "@/components/canvas/tactical-canvas";
import type { TacticalMarker, MarkerType, MarkerAffiliation } from "@/types/database";
import {
  createMarker,
  updateMarkerPosition,
  deleteMarker,
} from "@/app/actions/markers";

interface CanvasClientProps {
  mapId: string;
  imageUrl: string;
  initialGridType: GridType;
  initialGridSize: number;
  initialMarkers: TacticalMarker[];
  canEdit: boolean;
}

export default function CanvasClient({
  mapId,
  imageUrl,
  initialGridType,
  initialGridSize,
  initialMarkers,
  canEdit,
}: CanvasClientProps) {
  // ── Marker callbacks wired to server actions ──────────────────────────────

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
    // Fire-and-forget position update
    updateMarkerPosition(markerId, x, y);
  }

  function handleMarkerDeleted(markerId: string) {
    // Fire-and-forget delete
    deleteMarker(markerId);
  }

  return (
    <TacticalCanvas
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
  );
}
