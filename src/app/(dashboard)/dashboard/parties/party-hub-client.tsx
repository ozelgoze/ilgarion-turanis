"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import PageTransition from "@/components/page-transition";
import { AuthPartyCard } from "@/components/party-card";
import {
  PARTY_ACTIVITIES,
  SC_LOCATIONS,
  type PartyActivity,
  type PartyNotification,
  type PartyWithDetails,
  type LeaderReputation,
} from "@/types/database";
import { createParty, searchParties, joinParty, getLeaderReputation } from "@/app/actions/parties";
import PartyNotifications from "@/components/party-notifications";

interface PartyHubClientProps {
  openParties: PartyWithDetails[];
  myParties: PartyWithDetails[];
  currentUserId: string;
  currentCallsign: string;
  currentScHandle: string | null;
  notifications: PartyNotification[];
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
  notifications,
}: PartyHubClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("find");
  const [parties, setParties] = useState(initialParties);
  const [myParties] = useState(initialMyParties);

  // ── Leader reputation cache ──
  const [reputations, setReputations] = useState<Record<string, LeaderReputation | null>>({});

  // Load reputations for all visible parties' creators
  useEffect(() => {
    const allParties = [...parties, ...myParties];
    const creatorIds = [...new Set(allParties.map((p) => p.creator_id))];
    const missing = creatorIds.filter((id) => !(id in reputations));
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (id) => {
        const rep = await getLeaderReputation(id);
        return [id, rep] as const;
      })
    ).then((results) => {
      setReputations((prev) => {
        const next = { ...prev };
        for (const [id, rep] of results) next[id] = rep;
        return next;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties, myParties]);

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
  const [createPasscode, setCreatePasscode] = useState("");
  const [createStation, setCreateStation] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Join state ───────────────
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [passcodePrompt, setPasscodePrompt] = useState<{ partyId: string; creatorId: string } | null>(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [searchHasSpots, setSearchHasSpots] = useState(false);

  // ── Real-time: listen for party list changes via broadcast ──
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const notifChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const refreshList = useCallback(async () => {
    const results = await searchParties({
      activity: searchActivity || undefined,
      search: searchText || undefined,
      region: searchRegion || undefined,
      sort: searchSort,
    });
    setParties(results);
  }, [searchActivity, searchText, searchRegion, searchSort]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("party-hub", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "party_list_change" }, () => {
        refreshList();
      })
      .subscribe();

    channelRef.current = channel;

    // Subscribe to notification broadcast channel for sending
    const notifCh = supabase.channel("party-notifications", { config: { broadcast: { self: false } } }).subscribe();
    notifChannelRef.current = notifCh;

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(notifCh);
      channelRef.current = null;
      notifChannelRef.current = null;
    };
  }, [refreshList]);

  function broadcastNotification(targetUserIds: string[]) {
    notifChannelRef.current?.send({
      type: "broadcast",
      event: "new_notification",
      payload: { targetUserIds },
    });
  }

  function broadcastListChange() {
    channelRef.current?.send({
      type: "broadcast",
      event: "party_list_change",
      payload: { sender: currentUserId },
    });
  }

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
      passcode: createPasscode || undefined,
      startingStation: createStation || undefined,
    });

    setCreating(false);
    if (result.error) {
      setCreateError(result.error);
    } else if (result.party) {
      broadcastListChange();
      router.push(`/dashboard/parties/${result.party.id}`);
    }
  }

  async function handleJoin(partyId: string, passcode?: string) {
    // Check if party is private and we don't have a passcode yet
    const targetParty = parties.find((p) => p.id === partyId);
    if (targetParty?.passcode && !passcode) {
      setPasscodePrompt({ partyId, creatorId: targetParty.creator_id });
      setPasscodeInput("");
      return;
    }

    setJoiningId(partyId);
    setJoinError(null);
    const result = await joinParty(partyId, passcode);
    setJoiningId(null);
    if (result.error) {
      if (result.error.includes("PASSCODE")) {
        // Show passcode prompt
        setPasscodePrompt({ partyId, creatorId: targetParty?.creator_id ?? "" });
        setPasscodeInput("");
        setJoinError(result.error);
      } else {
        setJoinError(result.error);
      }
      setTimeout(() => setJoinError(null), 3000);
    } else {
      setPasscodePrompt(null);
      broadcastListChange();
      if (targetParty) {
        broadcastNotification([targetParty.creator_id]);
      }
      router.push(`/dashboard/parties/${partyId}`);
    }
  }

  async function handlePasscodeJoin() {
    if (!passcodePrompt) return;
    await handleJoin(passcodePrompt.partyId, passcodeInput);
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
        <PartyNotifications notifications={notifications} userId={currentUserId} />
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

      {/* Passcode prompt dialog */}
      {passcodePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mtc-panel bg-bg-surface p-6 max-w-xs w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-amber" />
              <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
                Private Party
              </h2>
            </div>
            <p className="font-mono text-[10px] text-text-muted tracking-widest mb-3">
              This party requires a passcode to join.
            </p>
            <input
              type="text"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handlePasscodeJoin(); }}
              placeholder="Enter passcode..."
              className="mtc-input font-mono text-sm w-full mb-4 uppercase"
              autoFocus
            />
            {joinError && joinError.includes("PASSCODE") && (
              <p className="font-mono text-[9px] text-danger tracking-widest mb-3">
                {joinError}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setPasscodePrompt(null)} className="mtc-btn-ghost text-[10px]">
                CANCEL
              </button>
              <button
                onClick={handlePasscodeJoin}
                disabled={!passcodeInput.trim() || joiningId !== null}
                className="mtc-btn-primary text-[10px]"
              >
                {joiningId ? "..." : "JOIN"}
              </button>
            </div>
          </div>
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
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchHasSpots}
                  onChange={(e) => setSearchHasSpots(e.target.checked)}
                  className="accent-accent"
                />
                <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase whitespace-nowrap">
                  Has Spots
                </span>
              </label>
              <button
                onClick={() => {
                  setSearchActivity("");
                  setSearchText("");
                  setSearchRegion("");
                  setSearchSort("newest");
                  setSearchHasSpots(false);
                }}
                className="mtc-btn-ghost whitespace-nowrap text-[10px]"
              >
                RESET
              </button>
            </div>
          </div>

          {/* Results */}
          {(() => {
            const filtered = searchHasSpots
              ? parties.filter((p) => (p.member_count ?? 0) < p.max_players)
              : parties;
            return filtered.length === 0 ? (
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
              {filtered.map((party) => (
                <AuthPartyCard
                  key={party.id}
                  party={party}
                  currentUserId={currentUserId}
                  onJoin={() => handleJoin(party.id)}
                  joining={joiningId === party.id}
                  reputation={reputations[party.creator_id] ?? undefined}
                />
              ))}
            </div>
          );
          })()}
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

            {/* Starting station */}
            <div className="space-y-1">
              <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Starting Station (optional)
              </label>
              <select
                value={createStation}
                onChange={(e) => setCreateStation(e.target.value)}
                className="mtc-input font-mono text-[11px] w-full"
              >
                <option value="">Any / Not specified</option>
                {SC_LOCATIONS.map((group) => (
                  <optgroup key={group.system} label={`── ${group.system} ──`}>
                    {group.locations.map((loc) => (
                      <option key={loc.value} value={loc.value}>
                        {loc.label} ({loc.type})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Private party passcode */}
            <div className="space-y-1">
              <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Passcode (optional — makes party private)
              </label>
              <input
                type="text"
                value={createPasscode}
                onChange={(e) => setCreatePasscode(e.target.value)}
                placeholder="Leave empty for public party"
                maxLength={20}
                className="mtc-input font-mono text-[11px] w-full uppercase"
              />
              {createPasscode && (
                <p className="font-mono text-[8px] text-amber/70 tracking-widest">
                  Players will need this passcode to join. Share it with your squad.
                </p>
              )}
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
              {creating ? "CREATING..." : createPasscode ? "CREATE PRIVATE PARTY" : "CREATE PARTY"}
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
                <AuthPartyCard
                  key={party.id}
                  party={party}
                  currentUserId={currentUserId}
                  isMine
                  reputation={reputations[party.creator_id] ?? undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </PageTransition>
  );
}

// Party card rendering is now handled by <AuthPartyCard /> from @/components/party-card

