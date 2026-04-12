import Link from "next/link";
import { getAllMyBriefings } from "@/app/actions/briefings";
import type { BriefingWithTeam } from "@/app/actions/briefings";

export default async function BriefingsIndexPage() {
  const briefings = await getAllMyBriefings();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-amber" />
            <h1 className="font-mono text-xs tracking-[0.3em] text-text-dim uppercase">
              Operational Briefings
            </h1>
          </div>
          <p className="font-mono text-[10px] text-text-muted tracking-widest pl-4">
            {briefings.length} BRIEFING{briefings.length !== 1 ? "S" : ""} ACROSS ALL UNITS
          </p>
        </div>
      </div>

      {briefings.length === 0 ? (
        <div className="mtc-panel bg-bg-surface p-12 text-center">
          <div className="mb-4 flex justify-center opacity-30">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-text-muted">
              <rect x="6" y="4" width="28" height="32" stroke="currentColor" strokeWidth="1.5" />
              <line x1="12" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1" />
              <line x1="12" y1="18" x2="28" y2="18" stroke="currentColor" strokeWidth="1" />
              <line x1="12" y1="24" x2="22" y2="24" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
          <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-1">
            No Briefings Available
          </p>
          <p className="font-mono text-[10px] text-text-muted tracking-widest">
            Briefings are created within team views. Join or create a unit to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {briefings.map((b) => (
            <BriefingCard key={b.id} briefing={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BriefingCard({ briefing }: { briefing: BriefingWithTeam }) {
  const createdDate = new Date(briefing.created_at).toLocaleDateString(
    "en-GB",
    { day: "2-digit", month: "short", year: "numeric" }
  );
  const hasEmbed = !!briefing.embed_url;

  return (
    <Link href={`/dashboard/briefings/${briefing.id}`} className="block group">
      <div className="mtc-panel bg-bg-surface p-5 transition-all duration-150 hover:bg-bg-elevated hover:border-amber/40 cursor-pointer">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
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
          <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase truncate max-w-[100px]">
            {(briefing.teams as { name: string })?.name}
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
