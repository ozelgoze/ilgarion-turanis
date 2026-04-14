"use client";

import Link from "next/link";
import {
  PARTY_ACTIVITIES,
  PARTY_STATUS_LABELS,
  SC_LOCATIONS,
  type PublicPartyListing,
  type PartyWithDetails,
  type LeaderReputation,
} from "@/types/database";

// ── Helpers ────────────────────────────────────────────────────────────────

function getStationLabel(value: string): { label: string; system: string; color: string } | null {
  for (const group of SC_LOCATIONS) {
    const loc = group.locations.find((l) => l.value === value);
    if (loc) return { label: loc.label, system: group.system, color: group.color };
  }
  return null;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Reputation Stars ────────────────────────────────────────────────────────

function ReputationStars({ reputation }: { reputation: LeaderReputation }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="font-mono text-[8px] text-text-muted/60 tracking-widest uppercase">Leader:</span>
      <div className="flex items-center gap-px">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} width="8" height="8" viewBox="0 0 24 24" fill={s <= Math.round(reputation.avg_stars) ? "#F0A500" : "none"} stroke={s <= Math.round(reputation.avg_stars) ? "#F0A500" : "#45A29E40"} strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
      <span className="font-mono text-[8px] text-amber tracking-widest">{reputation.avg_stars}</span>
      <span className="font-mono text-[7px] text-text-muted/50 tracking-widest">
        ({reputation.total_ratings} vote{reputation.total_ratings !== 1 ? "s" : ""} / {reputation.parties_led} {reputation.parties_led !== 1 ? "parties" : "party"})
      </span>
    </div>
  );
}

// ── Public Party Card (landing page) ────────────────────────────────────────

export function PublicPartyCard({
  party,
  onJoinClick,
}: {
  party: PublicPartyListing;
  onJoinClick?: () => void;
}) {
  const activity = PARTY_ACTIVITIES[party.activity];
  const status = PARTY_STATUS_LABELS[party.status];
  const spotsLeft = party.max_players - party.member_count;
  const createdAgo = getTimeAgo(party.created_at);

  return (
    <div className="mtc-panel bg-bg-surface p-5 transition-all duration-150 hover:bg-bg-elevated hover:translate-y-[-1px] hover:shadow-[0_4px_20px_rgba(0,255,204,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2"
            style={{ backgroundColor: activity.color }}
          />
          <span
            className="font-mono text-[9px] tracking-widest uppercase"
            style={{ color: activity.color }}
          >
            {activity.label}
          </span>
        </div>
        <span
          className="font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 border"
          style={{ color: status.color, borderColor: `${status.color}40` }}
        >
          {status.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-mono font-bold text-text-bright text-sm tracking-wide mb-2 line-clamp-2 flex items-center gap-1.5">
        {party.is_private && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F0A500" strokeWidth="2" strokeLinecap="square" className="shrink-0">
            <rect x="3" y="11" width="18" height="11" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
        {party.title}
      </h3>

      {/* Description */}
      {party.description && (
        <p className="font-mono text-[10px] text-text-muted tracking-wide leading-relaxed mb-3 line-clamp-2">
          {party.description}
        </p>
      )}

      {/* Creator info */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="font-mono text-[9px] text-text-muted tracking-widest">
          by {party.creator_callsign}
        </span>
        {party.creator_sc_handle && (
          <span className="font-mono text-[8px] text-accent/60 tracking-widest">
            RSI: {party.creator_sc_handle}
          </span>
        )}
        {party.region && party.region !== "any" && (
          <span className="font-mono text-[7px] text-text-muted/60 tracking-widest uppercase border border-border/50 px-1 py-0.5">
            {party.region}
          </span>
        )}
        {party.starting_station && (() => {
          const station = getStationLabel(party.starting_station);
          if (!station) return null;
          return (
            <span
              className="font-mono text-[7px] tracking-widest uppercase border px-1 py-0.5"
              style={{ color: station.color, borderColor: `${station.color}40` }}
            >
              {station.label}
            </span>
          );
        })()}
      </div>

      {/* Leader reputation */}
      {party.creator_reputation && (
        <div className="mb-3">
          <ReputationStars reputation={party.creator_reputation} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-text-muted tracking-widest">
            {party.member_count}/{party.max_players}
          </span>
          {spotsLeft > 0 && party.status === "open" && (
            <span className="font-mono text-[8px] text-accent/60 tracking-widest">
              {spotsLeft} SPOT{spotsLeft !== 1 ? "S" : ""} LEFT
            </span>
          )}
          <span className="font-mono text-[8px] text-text-muted/50 tracking-widest">
            {createdAgo}
          </span>
        </div>

        {/* Join CTA — links to login for guests */}
        {party.status === "open" && spotsLeft > 0 && (
          <button
            onClick={onJoinClick}
            className="mtc-btn-primary text-[10px] px-3 py-1"
          >
            JOIN
          </button>
        )}
      </div>
    </div>
  );
}

// ── Authenticated Party Card (dashboard) ────────────────────────────────────

export function AuthPartyCard({
  party,
  currentUserId,
  onJoin,
  joining,
  isMine,
  reputation,
}: {
  party: PartyWithDetails;
  currentUserId: string;
  onJoin?: () => void;
  joining?: boolean;
  isMine?: boolean;
  reputation?: LeaderReputation;
}) {
  const activity = PARTY_ACTIVITIES[party.activity];
  const status = PARTY_STATUS_LABELS[party.status];
  const isMember = party.members?.some((m) => m.user_id === currentUserId);
  const isCreator = party.creator_id === currentUserId;
  const spotsLeft = party.max_players - (party.member_count ?? 0);
  const createdAgo = getTimeAgo(party.created_at);

  return (
    <div className="mtc-panel bg-bg-surface p-5 transition-all duration-150 hover:bg-bg-elevated">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2"
            style={{ backgroundColor: activity.color }}
          />
          <span
            className="font-mono text-[9px] tracking-widest uppercase"
            style={{ color: activity.color }}
          >
            {activity.label}
          </span>
        </div>
        <span
          className="font-mono text-[8px] tracking-widest uppercase px-1.5 py-0.5 border"
          style={{ color: status.color, borderColor: `${status.color}40` }}
        >
          {status.label}
        </span>
      </div>

      {/* Title */}
      <Link href={`/dashboard/parties/${party.id}`}>
        <h3 className="font-mono font-bold text-text-bright text-sm tracking-wide mb-2 hover:text-accent transition-colors line-clamp-2 cursor-pointer flex items-center gap-1.5">
          {party.passcode && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F0A500" strokeWidth="2" strokeLinecap="square" className="shrink-0">
              <rect x="3" y="11" width="18" height="11" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
          {party.title}
        </h3>
      </Link>

      {/* Description */}
      {party.description && (
        <p className="font-mono text-[10px] text-text-muted tracking-wide leading-relaxed mb-3 line-clamp-2">
          {party.description}
        </p>
      )}

      {/* Creator info + region */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="font-mono text-[9px] text-text-muted tracking-widest">
          by {party.creator?.callsign ?? "UNKNOWN"}
        </span>
        {party.creator?.sc_handle && (
          <span className="font-mono text-[8px] text-accent/60 tracking-widest">
            RSI: {party.creator.sc_handle}
          </span>
        )}
        {party.region && party.region !== "any" && (
          <span className="font-mono text-[7px] text-text-muted/60 tracking-widest uppercase border border-border/50 px-1 py-0.5">
            {party.region}
          </span>
        )}
        {party.starting_station && (() => {
          const station = getStationLabel(party.starting_station);
          if (!station) return null;
          return (
            <span
              className="font-mono text-[7px] tracking-widest uppercase border px-1 py-0.5"
              style={{ color: station.color, borderColor: `${station.color}40` }}
            >
              {station.label}
            </span>
          );
        })()}
      </div>

      {/* Leader reputation */}
      {reputation && (
        <div className="mb-3">
          <ReputationStars reputation={reputation} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-text-muted tracking-widest">
            {party.member_count}/{party.max_players}
          </span>
          {spotsLeft > 0 && party.status === "open" && (
            <span className="font-mono text-[8px] text-accent/60 tracking-widest">
              {spotsLeft} SPOT{spotsLeft !== 1 ? "S" : ""} LEFT
            </span>
          )}
          <span className="font-mono text-[8px] text-text-muted/50 tracking-widest">
            {createdAgo}
          </span>
        </div>

        {/* Actions */}
        {!isMember && !isCreator && party.status === "open" && onJoin && (
          <button
            onClick={onJoin}
            disabled={joining}
            className="mtc-btn-primary text-[10px] px-3 py-1"
          >
            {joining ? "..." : "JOIN"}
          </button>
        )}
        {(isMember || isMine) && (
          <Link
            href={`/dashboard/parties/${party.id}`}
            className="font-mono text-[10px] tracking-widest text-accent hover:text-accent/80 uppercase transition-colors"
          >
            VIEW
          </Link>
        )}
      </div>
    </div>
  );
}
