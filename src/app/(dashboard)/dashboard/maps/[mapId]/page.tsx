import { notFound } from "next/navigation";
import Link from "next/link";
import { getMapWithSignedUrl } from "@/app/actions/maps";
import CanvasClient from "./canvas-client";
import type { GridType } from "@/components/canvas/tactical-canvas";

interface PageProps {
  params: Promise<{ mapId: string }>;
}

export default async function MapCanvasPage({ params }: PageProps) {
  const { mapId } = await params;
  const map = await getMapWithSignedUrl(mapId);

  if (!map) notFound();

  if (!map.signedUrl) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="mtc-panel bg-bg-surface p-8 text-center max-w-md">
          <p className="font-mono text-sm text-danger tracking-widest mb-2">
            IMAGE UNAVAILABLE
          </p>
          <p className="font-mono text-[10px] text-text-muted tracking-widest">
            The map image could not be loaded from storage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Canvas Top Bar */}
      <div className="h-10 shrink-0 bg-bg-surface border-b border-border flex items-center px-4 gap-4 z-10">
        <Link
          href={`/dashboard/teams/${map.team_id}`}
          className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-text-muted hover:text-text-dim transition-colors uppercase"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </Link>
        <div className="w-px h-4 bg-border" />
        <span className="font-mono text-[11px] tracking-widest text-text-primary uppercase">
          {map.name}
        </span>
        <div className="w-px h-4 bg-border" />
        <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase">
          {map.grid_type !== "none"
            ? `${map.grid_type} Grid · ${map.grid_size}px`
            : "No Grid"}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase">
            Live
          </span>
        </div>
      </div>

      {/* Canvas Area — client component handles Fabric.js */}
      <CanvasClient
        mapId={mapId}
        imageUrl={map.signedUrl}
        initialGridType={map.grid_type as GridType}
        initialGridSize={map.grid_size}
      />
    </div>
  );
}
