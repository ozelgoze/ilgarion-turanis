"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/page-transition";
import {
  PARTY_ACTIVITIES,
  PARTY_STATUS_LABELS,
  type PartyActivity,
  type PartyWithDetails,
} from "@/types/database";
import { createParty, searchParties, joinParty } from "@/app/actions/parties";

interface PartyHubClientProps {
  openParties: PartyWithDetails[];
  myParties: PartyWithDetails[];
  currentUserId: string;
  currentCallsign: string;
  currentScHandle: string | null;
}

type Tab = "find" | "create" | "my";

const REGIONS = [
  { value: "na", label: "North America" },
  { value: "eu", label: "Europe" },
  { value: "apac", label: "Asia-Pacific" },
  { value: "oce", label: "Oceania" },
  { value: "sa", label: "South America" },
];

export default function PartyHubClient({
  openParties: initialParties,
  myParties: initialMyParties,
  currentUserId,
  currentCallsign,
  currentScHandle,
}: PartyHubClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("find");
  const [parties, setParties] = useState(initialParties);
  const [myParties] = useState(initialMyParties);

  // ── Search state ─────────────
  const [searchActivity, setSearchActivity] = useState<PartyActivity | "">("");
  const [searchText, setSearchText] = useState("");
  const [searchRegion, setSearchRegion] = useState("");
  const [searchSort, setSearchSort] = useState<"newest" | "oldest" | "spots">("newest");
  const [searching, setSearching] = useState(false);

  // ── Create state ─────────────
  const [createActivity, setCreateActivity] = useState<PartyActivity>("bounty_hunting");
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createMax, setCreateMax] = useState(4);
  const [createVoice, setCreateVoice] = useState("");
  const [createRegion, setCreateRegion] = useState("any");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Join state ───────────────
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleSearch() {
    setSearching(true);
    const results = await searchParties({
      activity: searchActivity || undefined,
      search: searchText || undefined,
      region: searchRegion || undefined,
      sort: searchSort,
    });
    setParties(results);
    setSearching(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const result = await createParty({
      activity: createActivity,
      title: createTitle,
      description: createDesc,
      maxPlayers: createMax,
      voiceChat: createVoice,
      region: createRegion,
    });

    setCreating(false);
    if (result.error) {
      setCreateError(result.error);
    } else if (result.party) {
      router.push(`/dashboard/parties/${result.party.id}`);
    }
  }

  async function handleJoin(partyId: string) {
    setJoiningId(partyId);
    setJoinError(null);
    const result = await joinParty(partyId);
    setJoiningId(null);
    if (result.error) {
      setJoinError(result.error);
      setTimeout(() => setJoinError(null), 3000);
    } else {
      router.push(`/dashboard/parties/${partyId}`);
    }
  }

  return (
    <PageTransition className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <nav className="flex items-center gap-2 mb-4">
            <Link href="/dashboard" className="font-mono text-[10px] tracking-widest text-text-muted hover:text-text-dim uppercase transition-colors">
              OPS CENTER
            </Link>
            <span className="font-mono text-[10px] text-border">&rsaquo;</span>
            <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
              Party Finder
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-accent" />
            <h1 className="font-mono text-xs tracking-[0.3em] text-text-dim uppercase">
              Party Finder / LFG
            </h1>
          </div>
          <p className="font-mono text-[10px] text-text-muted tracking-widest pl-4 mt-1">
            {currentCallsign}{currentScHandle ? ` · RSI: ${currentScHandle}` : ""}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-6">
        {([
          { id: "find" as Tab, label: "Find Party", count: parties.length },
          { id: "create" as Tab, label: "Create Party" },
          { id: "my" as Tab, label: "My Parties", count: myParties.length },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-4 py-2.5 font-mono text-[11px] tracking-widest uppercase border-b-2 transition-colors",
              tab === t.id
                ? "text-accent border-accent bg-accent/5"
                : "text-text-muted hover:text-text-dim border-transparent",
            ].join(" ")}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-[9px] text-text-muted">
                [{t.count}]
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Join error toast */}
      {joinError && (
        <div className="mb-4 border border-danger/30 bg-danger/5 px-4 py-2">
          <p className="font-mono text-[10px] text-danger tracking-widest">{joinError}</p>
        </div>
      )}

      {/* ── Find Party Tab ───────────────────────────────────────── */}
      {tab === "find" && (
        <div>
          {/* Search controls */}
          <div className="mtc-panel bg-bg-surface p-4 mb-6">
            <div className="flex flex-wrap items-end gap-3 mb-3">
              <div className="flex-1 min-w-[160px] space-y-1">
                <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  Activity
                </label>
                <select
                  value={searchActivity}
                  onChange={(e) => setSearchActivity(e.target.value as PartyActivity | "")}
                  className="mtc-input font-mono text-[11px] w-full"
                >
                  <option value="">All Activities</option>
                  {Object.entries(PARTY_ACTIVITIES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[160px] space-y-1">
                <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  Search
                </label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by title..."
                  className="mtc-input font-mono text-[11px] w-full"
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[130px] space-y-1">
                <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  Region
                </label>
                <select
                  value={searchRegion}
                  onChange={(e) => setSearchRegion(e.target.value)}
                  className="mtc-input font-mono text-[11px] w-full"
                >
                  <option value="">Any Region</option>
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[130px] space-y-1">
                <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  Sort By
                </label>
                <select
                  value={searchSort}
                  onChange={(e) => setSearchSort(e.target.value as "newest" | "oldest" | "spots")}
                  className="mtc-input font-mono text-[11px] w-full"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="spots">Most Spots</option>
                </select>
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="mtc-btn-primary whitespace-nowrap"
              >
                {searching ? "SEARCHING..." : "SEARCH"}
              </button>
              <button
                onClick={() => {
                  setSearchActivity("");
                  setSearchText("");
                  setSearchRegion("");
                  setSearchSort("newest");
                }}
                className="mtc-btn-ghost whitespace-nowrap text-[10px]"
              >
                RESET
              </button>
            </div>
          </div>

          {/* Results */}
          {parties.length === 0 ? (
            <div className="mtc-panel bg-bg-surface p-10 text-center">
              <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-2">
                No Parties Found
              </p>
              <p className="font-mono text-[10px] text-text-muted tracking-widest mb-3">
                No open parties match your search. Create one to get started.
              </p>
              <button onClick={() => setTab("create")} className="mtc-btn-primary text-sm">
                + CREATE PARTY
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {parties.map((party) => (
                <PartyCard
                  key={party.id}
                  party={party}
                  currentUserId={currentUserId}
                  onJoin={() => handleJoin(party.id)}
                  joining={joiningId === party.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Party Tab ─────────────────────────────────────── */}
      {tab === "create" && (
        <div className="mtc-panel bg-bg-surface p-6 max-w-xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-accent" />
            <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
              Create Party
            </h2>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Activity selector grid */}
            <div className="space-y-1">
              <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Activity Type
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {Object.entries(PARTY_ACTIVITIES).map(([key, val]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCreateActivity(key as PartyActivity)}
                    className={[
                      "p-2 border font-mono text-[9px] tracking-wide uppercase text-left transition-colors",
                      createActivity === key
                        ? "bg-opacity-15"
                        : "border-border text-text-muted hover:border-border-bright",
                    ].join(" ")}
                    style={
                      createActivity === key
                        ? { color: val.color, borderColor: `${val.color}50`, backgroundColor: `${val.color}12` }
                        : undefined
                    }
                  >
                    {val.label}
                  </button>
                ))}
              </div>
              <p className="font-mono text-[8px] text-text-muted/60 tracking-widest mt-1">
                {PARTY_ACTIVITIES[createActivity].description}
              </p>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Party Title
              </label>
              <input
                type="text"
                required
                maxLength={80}
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder={`e.g. ${PARTY_ACTIVITIES[createActivity].label} — need ${createMax - 1} more`}
                className="mtc-input font-mono text-sm w-full"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Description (optional)
              </label>
              <textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="What you're planning, requirements, ship preferences..."
                rows={3}
                maxLength={500}
                className="mtc-input font-mono text-[11px] w-full resize-none"
              />
            </div>

            {/* Max players + Region + Voice */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  Max Players
                </label>
                <select
                  value={createMax}
                  onChange={(e) => setCreateMax(Number(e.target.value))}
                  className="mtc-input font-mono text-sm w-full"
                >
                  {[2, 3, 4, 5, 6, 8, 10, 16, 32].map((n) => (
                    <option key={n} value={n}>{n} players</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  Region
                </label>
                <select
                  value={createRegion}
                  onChange={(e) => setCreateRegion(e.target.value)}
                  className="mtc-input font-mono text-sm w-full"
                >
                  <option value="any">Any</option>
                  {REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  Voice Chat
                </label>
                <input
                  type="text"
                  value={createVoice}
                  onChange={(e) => setCreateVoice(e.target.value)}
                  placeholder="Discord link..."
                  className="mtc-input font-mono text-[11px] w-full"
                />
              </div>
            </div>

            {createError && (
              <div className="border border-danger/30 bg-danger/5 px-3 py-2">
                <p className="font-mono text-[10px] text-danger tracking-widest">{createError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={creating || !createTitle.trim()}
              className="mtc-btn-primary w-full"
            >
              {creating ? "CREATING..." : "CREATE PARTY"}
            </button>
          </form>
        </div>
      )}

      {/* ── My Parties Tab ───────────────────────────────────────── */}
      {tab === "my" && (
        <div>
          {myParties.length === 0 ? (
            <div className="mtc-panel bg-bg-surface p-10 text-center">
              <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-2">
                No Active Parties
              </p>
              <p className="font-mono text-[10px] text-text-muted tracking-widest mb-3">
                You haven&apos;t joined or created any parties yet.
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setTab("find")} className="mtc-btn-ghost text-sm">
                  FIND PARTY
                </button>
                <button onClick={() => setTab("create")} className="mtc-btn-primary text-sm">
                  + CREATE PARTY
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myParties.map((party) => (
                <PartyCard
                  key={party.id}
                  party={party}
                  currentUserId={currentUserId}
                  isMine
                />
              ))}
            </div>
          )}
        </div>
      )}
    </PageTransition>
  );
}

// ── Party Card ──────────────────────────────────────────────────────────────

function PartyCard({
  party,
  currentUserId,
  onJoin,
  joining,
  isMine,
}: {
  party: PartyWithDetails;
  currentUserId: string;
  onJoin?: () => void;
  joining?: boolean;
  isMine?: boolean;
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
        <h3 className="font-mono font-bold text-text-bright text-sm tracking-wide mb-2 hover:text-accent transition-colors line-clamp-2 cursor-pointer">
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
      </div>

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
