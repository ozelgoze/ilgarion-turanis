import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getBriefing } from "@/app/actions/briefings";
import { getTeamInfo } from "@/app/actions/maps";
import { canEdit as checkCanEdit } from "@/types/database";
import { createClient } from "@/utils/supabase/server";
import BriefingEditor from "./briefing-editor";

interface PageProps {
  params: Promise<{ briefingId: string }>;
}

export default async function BriefingPage({ params }: PageProps) {
  const { briefingId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const briefing = await getBriefing(briefingId);
  if (!briefing) notFound();

  const teamInfo = await getTeamInfo(briefing.team_id);
  if (!teamInfo) notFound();

  const userCanEdit = checkCanEdit(teamInfo.my_role);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Bar */}
      <div className="h-10 shrink-0 bg-bg-surface border-b border-border flex items-center px-4 gap-4 z-10">
        <Link
          href={`/dashboard/teams/${briefing.team_id}`}
          className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-text-muted hover:text-text-dim transition-colors uppercase"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </Link>
        <div className="w-px h-4 bg-border" />
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
        <span className="font-mono text-[11px] tracking-widest text-text-primary uppercase truncate max-w-[300px]">
          {briefing.title}
        </span>

        {/* Author + Role */}
        <div className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase hidden md:block">
            By {briefing.profiles?.callsign ?? "UNKNOWN"}
          </span>
          <span
            className="font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 border"
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
        </div>
      </div>

      {/* Content Area */}
      <BriefingEditor
        briefing={briefing}
        canEdit={userCanEdit}
      />
    </div>
  );
}
