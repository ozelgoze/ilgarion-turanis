import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getMapWithSignedUrl } from "@/app/actions/maps";
import { getTeamInfo } from "@/app/actions/maps";
import { getMapMarkers } from "@/app/actions/markers";
import { getMapDrawings } from "@/app/actions/drawings";
import { getTeamBriefings } from "@/app/actions/briefings";
import { getTeamMembers } from "@/app/actions/teams";
import { canEdit as checkCanEdit } from "@/types/database";
import { createClient } from "@/utils/supabase/server";
import CanvasClient from "./canvas-client";
import type { GridType } from "@/components/canvas/tactical-canvas";

interface PageProps {
  params: Promise<{ mapId: string }>;
}

export default async function MapCanvasPage({ params }: PageProps) {
  const { mapId } = await params;

  // Current authenticated user + profile (needed for presence)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("callsign")
    .eq("id", user.id)
    .single();
  const currentCallsign = profile?.callsign ?? "OPERATIVE";

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

  // Fetch team role + markers + drawings + briefings in parallel
  const [teamInfo, markers, drawings, briefings, teamMembers] = await Promise.all([
    getTeamInfo(map.team_id),
    getMapMarkers(mapId),
    getMapDrawings(mapId),
    getTeamBriefings(map.team_id),
    getTeamMembers(map.team_id),
  ]);

  const userCanEdit = teamInfo ? checkCanEdit(teamInfo.my_role) : false;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Canvas Top Bar */}
      <div className="h-10 shrink-0 bg-bg-surface border-b border-border flex items-center px-4 gap-4 z-10">
        <Link
          href={`/dashboard/teams/${map.team_id}`}
          className="flex items-center gap-1.5 font-mono text-[11px] tracking-widest text-text-muted hover:text-text-dim transition-colors uppercase"
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </Link>
        <div className="w-px h-4 bg-border" />
        <span className="font-mono text-xs tracking-widest text-text-primary uppercase">
          {map.name}
        </span>
        <div className="w-px h-4 bg-border" />
        <span className="font-mono text-[11px] text-text-muted tracking-widest uppercase">
          {map.grid_type !== "none"
            ? `${map.grid_type} Grid · ${map.grid_size}px`
            : "No Grid"}
        </span>

        {/* Marker count */}
        {markers.length > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <span className="font-mono text-[11px] text-text-muted tracking-widest uppercase">
              {markers.length} Marker{markers.length !== 1 ? "s" : ""}
            </span>
          </>
        )}

        {/* Role badge */}
        {teamInfo && (
          <div className="ml-auto flex items-center gap-2">
            <span
              className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 border"
              style={{
                color: userCanEdit ? "#00ffcc" : "#45A29E",
                borderColor: userCanEdit
                  ? "rgba(0,255,204,0.3)"
                  : "rgba(69,162,158,0.3)",
                backgroundColor: userCanEdit
                  ? "rgba(0,255,204,0.05)"
                  : "rgba(69,162,158,0.05)",
              }}
            >
              {teamInfo.my_role.toUpperCase()}
            </span>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="font-mono text-[11px] text-text-muted tracking-widest uppercase">
              Live
            </span>
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <CanvasClient
        mapId={mapId}
        imageUrl={map.signedUrl}
        initialGridType={map.grid_type as GridType}
        initialGridSize={map.grid_size}
        initialMarkers={markers}
        initialDrawings={drawings}
        latestBriefing={briefings.length > 0 ? briefings[0] : null}
        scaleFactor={map.scale_factor}
        canEdit={userCanEdit}
        currentUserId={user.id}
        currentCallsign={currentCallsign}
        teamMembers={teamMembers}
      />
    </div>
  );
}
