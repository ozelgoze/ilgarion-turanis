"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import AppLogo from "@/components/mtc-logo";
import { PublicPartyCard } from "@/components/party-card";
import { createClient } from "@/utils/supabase/client";
import {
  PARTY_ACTIVITIES,
  type PartyActivity,
  type PublicPartyListing,
} from "@/types/database";
import { getPublicParties, getPublicPartyStats } from "@/app/actions/parties";

// ── Regions ─────────────────────────────────────────────────────────────────

const REGIONS = [
  { value: "na", label: "NA" },
  { value: "eu", label: "EU" },
  { value: "apac", label: "APAC" },
  { value: "oce", label: "OCE" },
  { value: "sa", label: "SA" },
];

// ── Activity entries for the filter strip ───────────────────────────────────

const ACTIVITY_ENTRIES = Object.entries(PARTY_ACTIVITIES) as [
  PartyActivity,
  (typeof PARTY_ACTIVITIES)[PartyActivity]
][];

// ── Landing Page ────────────────────────────────────────────────────────────

interface LandingClientProps {
  initialParties: PublicPartyListing[];
  isAuthenticated: boolean;
  stats: { activeParties: number; totalPlayers: number };
}

export default function LandingClient({
  initialParties,
  isAuthenticated,
  stats: initialStats,
}: LandingClientProps) {
  const router = useRouter();
  const [parties, setParties] = useState(initialParties);
  const [liveStats, setLiveStats] = useState(initialStats);
  const [filterActivity, setFilterActivity] = useState<PartyActivity | "">("");
  const [filterRegion, setFilterRegion] = useState("");
  const [hasSpots, setHasSpots] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Refs to access latest filter values inside broadcast callbacks
  const filterActivityRef = useRef(filterActivity);
  const filterRegionRef = useRef(filterRegion);
  filterActivityRef.current = filterActivity;
  filterRegionRef.current = filterRegion;

  // ── Refresh party list + stats ────────────────────────────
  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [results, stats] = await Promise.all([
      getPublicParties({
        activity: filterActivityRef.current || undefined,
        region: filterRegionRef.current || undefined,
      }),
      getPublicPartyStats(),
    ]);
    setParties(results);
    setLiveStats(stats);
    setRefreshing(false);
  }, []);

  // ── Supabase Realtime: Broadcast + postgres_changes ───────
  useEffect(() => {
    const supabase = createClient();

    // Primary: Broadcast channel — same channel the dashboard writes to
    const broadcastChannel = supabase
      .channel("party-hub", {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "party_list_change" }, () => {
        // Another user created/joined/left/closed a party → refresh
        refresh();
      })
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    // Fallback: postgres_changes on the parties table for direct DB changes
    const dbChannel = supabase
      .channel("party-db-landing")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parties" },
        () => {
          refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "party_members" },
        () => {
          refresh();
        }
      )
      .subscribe();

    // Safety net: poll every 60s in case broadcast/postgres_changes miss events
    const fallbackInterval = setInterval(refresh, 60000);

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
      clearInterval(fallbackInterval);
    };
  }, [refresh]);

  // Re-fetch on filter change
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterActivity, filterRegion]);

  const filteredParties = hasSpots
    ? parties.filter((p) => p.member_count < p.max_players)
    : parties;

  function handleJoinClick() {
    if (isAuthenticated) {
      router.push("/dashboard/parties");
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary relative">
      {/* ── Navigation Bar ────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-bg-primary/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <AppLogo size="sm" />
            <span className="font-mono text-[11px] tracking-[0.3em] text-text-dim uppercase hidden sm:inline">
              UEE ATAK
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard" className="mtc-btn-primary text-[10px] px-4 py-2">
                OPS CENTER
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="font-mono text-[10px] tracking-widest text-text-dim hover:text-accent uppercase transition-colors px-3 py-2"
                >
                  LOGIN
                </Link>
                <Link href="/register" className="mtc-btn-primary text-[10px] px-4 py-2">
                  REGISTER
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 mtc-grid opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-primary" />

        {/* Animated glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] animate-pulse-slow" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Eyebrow */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-px bg-accent/40" />
              <span className="font-mono text-[9px] tracking-[0.4em] text-accent/70 uppercase">
                Star Citizen Party Finder
              </span>
              <div className="w-8 h-px bg-accent/40" />
            </div>

            {/* Main headline */}
            <h1 className="font-mono text-3xl sm:text-5xl lg:text-6xl font-bold tracking-wide text-text-bright uppercase mb-4">
              <span className="mtc-glow-text">FIND YOUR</span>{" "}
              <span className="text-accent">SQUAD</span>
            </h1>

            <p className="font-mono text-[12px] sm:text-sm text-text-dim tracking-widest max-w-lg mx-auto mb-8 leading-relaxed">
              Real-time LFG for the &apos;verse. Browse open parties, join a squad,
              and launch into Star Citizen missions together.
            </p>

            {/* Live stats ticker */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex items-center justify-center gap-6 mb-8"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                <span className="font-mono text-[11px] tracking-widest text-accent uppercase">
                  {liveStats.activeParties} ACTIVE PART{liveStats.activeParties !== 1 ? "IES" : "Y"}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] tracking-widest text-text-dim uppercase">
                  {liveStats.totalPlayers} PLAYER{liveStats.totalPlayers !== 1 ? "S" : ""} IN SQUADS
                </span>
              </div>
            </motion.div>

            {/* CTA buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  document.getElementById("party-feed")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mtc-btn-primary text-sm px-6 py-3"
              >
                BROWSE PARTIES ↓
              </button>
              {!isAuthenticated && (
                <Link href="/register" className="mtc-btn-ghost text-sm px-6 py-3">
                  SIGN UP FREE
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Activity Type Filter Strip ───────────────────────── */}
      <section id="party-feed" className="border-y border-border bg-bg-surface/50 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {/* All button */}
            <button
              onClick={() => setFilterActivity("")}
              className={[
                "shrink-0 px-3 py-1.5 font-mono text-[9px] tracking-widest uppercase border transition-colors",
                filterActivity === ""
                  ? "border-accent/40 text-accent bg-accent/10"
                  : "border-border text-text-muted hover:text-text-dim",
              ].join(" ")}
            >
              ALL
            </button>

            {/* Activity pills */}
            {ACTIVITY_ENTRIES.map(([key, val]) => (
              <button
                key={key}
                onClick={() => setFilterActivity(filterActivity === key ? "" : key)}
                className={[
                  "shrink-0 px-3 py-1.5 font-mono text-[9px] tracking-widest uppercase border transition-colors flex items-center gap-1.5",
                  filterActivity === key
                    ? "bg-opacity-15"
                    : "border-border text-text-muted hover:text-text-dim",
                ].join(" ")}
                style={
                  filterActivity === key
                    ? { color: val.color, borderColor: `${val.color}50`, backgroundColor: `${val.color}12` }
                    : undefined
                }
              >
                <span
                  className="w-1.5 h-1.5"
                  style={{ backgroundColor: val.color }}
                />
                {val.label}
              </button>
            ))}
          </div>

          {/* Secondary filters */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase">Region:</span>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="bg-bg-primary border border-border px-2 py-1 font-mono text-[9px] text-text-bright focus:border-accent/50 focus:outline-none"
              >
                <option value="">Any</option>
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSpots}
                onChange={(e) => setHasSpots(e.target.checked)}
                className="accent-accent"
              />
              <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Has Spots
              </span>
            </label>

            <div className="flex-1" />

            {/* Realtime status indicator */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                refreshing
                  ? "bg-amber animate-pulse"
                  : realtimeConnected
                    ? "bg-accent animate-pulse"
                    : "bg-text-muted/40"
              }`} />
              <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase">
                {refreshing ? "SYNCING..." : realtimeConnected ? "REALTIME" : "CONNECTING..."}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Party Cards Feed ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {filteredParties.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="mtc-panel bg-bg-surface p-12 text-center"
            >
              <div className="mb-4 flex justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent/20">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-2">
                No Parties Found
              </p>
              <p className="font-mono text-[10px] text-text-muted tracking-widest mb-4">
                {filterActivity
                  ? `No open ${PARTY_ACTIVITIES[filterActivity].label} parties right now.`
                  : "No open parties right now. Be the first to create one!"}
              </p>
              {isAuthenticated ? (
                <Link href="/dashboard/parties" className="mtc-btn-primary text-sm">
                  + CREATE PARTY
                </Link>
              ) : (
                <Link href="/register" className="mtc-btn-primary text-sm">
                  SIGN UP TO CREATE
                </Link>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredParties.map((party, i) => (
                <motion.div
                  key={party.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <PublicPartyCard
                    party={party}
                    onJoinClick={handleJoinClick}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create party prompt */}
        {filteredParties.length > 0 && (
          <div className="mt-6 text-center">
            {isAuthenticated ? (
              <Link href="/dashboard/parties" className="mtc-btn-ghost text-[10px]">
                + CREATE YOUR OWN PARTY
              </Link>
            ) : (
              <Link href="/register" className="mtc-btn-ghost text-[10px]">
                SIGN UP TO CREATE \u0026 JOIN PARTIES
              </Link>
            )}
          </div>
        )}
      </section>

      {/* ── Feature Showcase ──────────────────────────────────── */}
      <section className="border-t border-border bg-bg-surface/30">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-8 h-px bg-amber/40" />
              <span className="font-mono text-[9px] tracking-[0.4em] text-amber/70 uppercase">
                Beyond the Party Finder
              </span>
              <div className="w-8 h-px bg-amber/40" />
            </div>
            <h2 className="font-mono text-xl sm:text-2xl font-bold tracking-wide text-text-bright uppercase">
              Full Tactical Operations Suite
            </h2>
            <p className="font-mono text-[10px] text-text-muted tracking-widest mt-2 max-w-md mx-auto">
              Register to unlock the complete UEE ATAK toolset for your Star Citizen organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tactical Maps */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5 }}
              className="mtc-panel bg-bg-surface p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 border border-accent/30 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                    <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
                    <line x1="9" y1="3" x2="9" y2="18" />
                    <line x1="15" y1="6" x2="15" y2="21" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-mono text-xs tracking-[0.2em] text-text-bright uppercase">Tactical Maps</h3>
                  <p className="font-mono text-[8px] text-text-muted tracking-widest">REAL-TIME COLLABORATION</p>
                </div>
              </div>
              <ul className="space-y-2">
                {[
                  "NATO APP-6C military markers",
                  "Drawing tools (arrows, circles, lines)",
                  "Real-time multi-user sync",
                  "Fleet composition overlay",
                  "Threat condition indicators",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-accent/60 mt-1.5 shrink-0" />
                    <span className="font-mono text-[10px] text-text-dim tracking-wide">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Briefings */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mtc-panel bg-bg-surface p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 border border-amber/30 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber">
                    <rect x="3" y="3" width="18" height="18" rx="0" />
                    <line x1="7" y1="8" x2="17" y2="8" />
                    <line x1="7" y1="12" x2="17" y2="12" />
                    <line x1="7" y1="16" x2="13" y2="16" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-mono text-xs tracking-[0.2em] text-text-bright uppercase">Op Briefings</h3>
                  <p className="font-mono text-[8px] text-text-muted tracking-widest">MISSION DOCUMENTATION</p>
                </div>
              </div>
              <ul className="space-y-2">
                {[
                  "Markdown-powered briefing docs",
                  "Embed tactical map references",
                  "Operation phase tracking",
                  "Countdown timers & comms",
                  "Keyboard shortcut system",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-amber/60 mt-1.5 shrink-0" />
                    <span className="font-mono text-[10px] text-text-dim tracking-wide">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Fleet Management */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mtc-panel bg-bg-surface p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 border border-[#9B7FE8]/30 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#9B7FE8]">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-mono text-xs tracking-[0.2em] text-text-bright uppercase">Fleet &amp; Roster</h3>
                  <p className="font-mono text-[8px] text-text-muted tracking-widest">TEAM MANAGEMENT</p>
                </div>
              </div>
              <ul className="space-y-2">
                {[
                  "Unit roster with role assignments",
                  "Ship database (65+ vessels)",
                  "Fleet composition breakdown",
                  "SC profile integration",
                  "Stanton & Pyro reference tools",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-1 h-1 bg-[#9B7FE8]/60 mt-1.5 shrink-0" />
                    <span className="font-mono text-[10px] text-text-dim tracking-wide">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Bottom CTA */}
          {!isAuthenticated && (
            <div className="mt-10 text-center">
              <Link href="/register" className="mtc-btn-primary text-sm px-8 py-3">
                GET STARTED — FREE
              </Link>
              <p className="font-mono text-[8px] text-text-muted/50 tracking-widest mt-3">
                NO CREDIT CARD REQUIRED · COMMUNITY PROJECT
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppLogo size="sm" />
            <div>
              <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase block">
                UEE ATAK APP
              </span>
              <span className="font-mono text-[8px] tracking-widest text-text-muted">
                Ilgarion Turanis [SCG] — Tactical Operations
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase">
              ENCRYPTED CHANNEL
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              <span className="font-mono text-[8px] tracking-widest text-accent/60 uppercase">
                SYSTEMS ONLINE
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
