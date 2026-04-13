import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTeamInfo, getTeamMaps } from "@/app/actions/maps";
import { getTeamBriefings } from "@/app/actions/briefings";
import { getTeamMembers } from "@/app/actions/teams";
import { createClient } from "@/utils/supabase/server";
import { ROLE_COLORS, ROLE_LABELS, THREAT_LEVELS, canEdit, isCommander } from "@/types/database";
import type { TacticalMap, ThreatLevel } from "@/types/database";
import type { BriefingWithCreator } from "@/app/actions/briefings";
import CreateMapDialog from "./create-map-dialog";
import CreateBriefingDialog from "./create-briefing-dialog";
import TeamRoster from "./team-roster";
import FleetOverview from "./fleet-overview";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { teamId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [team, maps, briefings, members] = await Promise.all([
    getTeamInfo(teamId),
    getTeamMaps(teamId),
    getTeamBriefings(teamId),
    getTeamMembers(teamId),
  ]);

  if (!team) notFound();

  const roleColor = ROLE_COLORS[team.my_role];
  const roleLabel = ROLE_LABELS[team.my_role];
  const editable = canEdit(team.my_role);
  const commander = isCommander(team.my_role);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6">
        <Link
          href="/dashboard"
          className="font-mono text-[10px] tracking-widest text-text-muted hover:text-text-dim uppercase transition-colors"
        >
          OPS CENTER
        </Link>
        <span className="font-mono text-[10px] text-border">›</span>
        <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase truncate max-w-[200px]">
          {team.name}
        </span>
      </nav>

      {/* Team Header */}
      <div className="mtc-panel bg-bg-surface p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 bg-accent shrink-0" />
              <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
                Registered Unit
              </span>
            </div>
            <h1 className="font-mono font-bold text-text-bright text-xl tracking-wide mb-2">
              {team.name}
            </h1>
            {team.description && (
              <p className="text-sm text-text-dim leading-relaxed">
                {team.description}
              </p>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className="font-mono text-[10px] tracking-widest px-2 py-0.5 border"
              style={{ color: roleColor, borderColor: `${roleColor}40` }}
            >
              {roleLabel}
            </span>
            <span className="font-mono text-[10px] text-text-muted tracking-widest">
              {team.member_count} OPERATIVE{team.member_count !== 1 ? "S" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Fleet Overview */}
      <FleetOverview members={members} />

      {/* Maps Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-accent" />
          <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
            Tactical Maps
          </h2>
          <span className="font-mono text-[10px] text-text-muted">
            [{maps.length}]
          </span>
        </div>
        {editable && <CreateMapDialog teamId={teamId} />}
      </div>

      {/* Maps Grid */}
      {maps.length === 0 ? (
        <div className="mtc-panel bg-bg-surface p-10 text-center">
          <div className="mb-4 flex justify-center opacity-30">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-text-muted">
              <rect x="2" y="2" width="36" height="36" stroke="currentColor" strokeWidth="1.5" />
              <line x1="2" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="1" />
              <line x1="20" y1="2" x2="20" y2="38" stroke="currentColor" strokeWidth="1" />
              <circle cx="20" cy="20" r="5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-1">
            No Maps Uploaded
          </p>
          <p className="font-mono text-[10px] text-text-muted tracking-widest mb-2">
            {editable
              ? "Upload a map image to begin tactical planning."
              : "No maps have been created for this unit yet."}
          </p>
          <p className="font-mono text-[8px] text-text-muted/40 tracking-widest italic">
            &ldquo;Every operation begins with a map. Every map begins with intel.&rdquo;
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {maps.map((map) => (
            <MapCard key={map.id} map={map} />
          ))}
        </div>
      )}

      {/* Briefings Section */}
      <div className="flex items-center justify-between mb-4 mt-10">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-amber" />
          <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
            Operational Briefings
          </h2>
          <span className="font-mono text-[10px] text-text-muted">
            [{briefings.length}]
          </span>
        </div>
        {editable && <CreateBriefingDialog teamId={teamId} />}
      </div>

      {briefings.length === 0 ? (
        <div className="mtc-panel bg-bg-surface p-10 text-center">
          <div className="mb-4 flex justify-center opacity-30">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-text-muted">
              <rect x="6" y="4" width="28" height="32" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1" />
              <line x1="12" y1="18" x2="28" y2="18" stroke="currentColor" strokeWidth="1" />
              <line x1="12" y1="24" x2="22" y2="24" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
          <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-1">
            No Briefings
          </p>
          <p className="font-mono text-[10px] text-text-muted tracking-widest mb-2">
            {editable
              ? "Create a briefing to share intel, embed documents, or record SITREPs."
              : "No briefings have been created for this unit yet."}
          </p>
          <p className="font-mono text-[8px] text-text-muted/40 tracking-widest italic">
            &ldquo;A squad without a briefing is a squad without a mission.&rdquo;
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {briefings.map((b) => (
            <BriefingCard key={b.id} briefing={b} />
          ))}
        </div>
      )}

      {/* Unit Roster Section */}
      <div className="flex items-center justify-between mb-4 mt-10">
        <div className="flex items-center gap-3">
          <div className="w-1 h-5 bg-accent" />
          <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
            Unit Roster
          </h2>
          <span className="font-mono text-[10px] text-text-muted">
            [{members.length}]
          </span>
        </div>
      </div>

      <TeamRoster
        teamId={teamId}
        members={members}
        isCommander={commander}
        currentUserId={user.id}
      />
    </div>
  );
}

function BriefingCard({ briefing }: { briefing: BriefingWithCreator }) {
  const createdDate = new Date(briefing.created_at).toLocaleDateString(
    "en-GB",
    { day: "2-digit", month: "short", year: "numeric" }
  );
  const hasEmbed = !!briefing.embed_url;

  return (
    <Link href={`/dashboard/briefings/${briefing.id}`} className="block group">
      <div className="mtc-panel bg-bg-surface p-5 transition-all duration-150 hover:bg-bg-elevated hover:border-amber/40 cursor-pointer">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-amber/60 shrink-0"
          >
            <rect x="4" y="2" width="16" height="20" rx="1" />
            <line x1="8" y1="7" x2="16" y2="7" />
            <line x1="8" y1="11" x2="16" y2="11" />
            <line x1="8" y1="15" x2="12" y2="15" />
          </svg>
          <span className="font-mono text-[9px] tracking-widest text-text-dim uppercase">
            {hasEmbed ? "Briefing · Embed" : "Briefing · Notes"}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-mono font-bold text-text-bright text-sm tracking-wide mb-3 group-hover:text-amber transition-colors line-clamp-2">
          {briefing.title}
        </h3>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase truncate max-w-[120px]">
            {briefing.profiles?.callsign ?? "UNKNOWN"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-text-muted tracking-widest">
              {createdDate}
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-text-muted group-hover:text-amber transition-colors"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

function MapCard({ map }: { map: TacticalMap }) {
  const updatedDate = new Date(map.updated_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const threat = THREAT_LEVELS[(map.threat_level ?? 0) as ThreatLevel];
  const isHighThreat = (map.threat_level ?? 0) >= 2;

  return (
    <Link
      href={`/dashboard/maps/${map.id}`}
      className="block group"
    >
      <div className="mtc-panel bg-bg-surface p-5 transition-all duration-150 hover:bg-bg-elevated hover:border-accent/40 cursor-pointer">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent/60 shrink-0">
              <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
            </svg>
            <span className="font-mono text-[9px] tracking-widest text-text-dim uppercase">
              Tactical Map
            </span>
          </div>

          {/* Threat Level Badge */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 shrink-0 ${isHighThreat ? "animate-pulse" : ""}`}
              style={{ backgroundColor: threat.color }}
            />
            <span
              className="font-mono text-[8px] tracking-widest uppercase font-bold"
              style={{ color: threat.color }}
            >
              {threat.label}
            </span>
          </div>
        </div>

        {/* Name */}
        <h3 className="font-mono font-bold text-text-bright text-sm tracking-wide mb-3 group-hover:text-accent transition-colors line-clamp-2">
          {map.name}
        </h3>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase">
              {map.grid_type === "none" ? "No Grid" : `${map.grid_type} Grid`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-text-muted tracking-widest">
              {updatedDate}
            </span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted group-hover:text-accent transition-colors">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
