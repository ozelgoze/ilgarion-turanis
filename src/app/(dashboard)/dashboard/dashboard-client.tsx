"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition, {
  staggerContainer,
  staggerItem,
} from "@/components/page-transition";
import { ROLE_COLORS, ROLE_LABELS, type TeamWithRole } from "@/types/database";
import StantonReference from "@/components/stanton-reference";

interface DashboardStats {
  unitCount: number;
  mapCount: number;
  briefingCount: number;
  operativeCount: number;
  commanderCount: number;
  recentMapActivity: string | null;
}

interface DashboardClientProps {
  teams: TeamWithRole[];
  stats: DashboardStats;
}

export default function DashboardClient({
  teams,
  stats,
}: DashboardClientProps) {
  return (
    <PageTransition className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-accent" />
            <h1 className="font-mono text-xs tracking-[0.3em] text-text-dim uppercase">
              Operations Center
            </h1>
          </div>
          <p className="font-mono text-[10px] text-text-muted tracking-widest pl-4">
            {stats.unitCount} UNIT{stats.unitCount !== 1 ? "S" : ""} REGISTERED
          </p>
        </div>
        <Link
          href="/dashboard/teams/new"
          className="mtc-btn-primary text-sm"
        >
          + REGISTER UNIT
        </Link>
      </div>

      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
      >
        <StatCard label="UNITS" value={stats.unitCount} accent="accent" />
        <StatCard label="MAPS" value={stats.mapCount} accent="accent" />
        <StatCard label="BRIEFINGS" value={stats.briefingCount} accent="amber" />
        <StatCard label="OPERATIVES" value={stats.operativeCount} accent="accent" />
      </motion.div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {teams.map((team) => (
            <motion.div key={team.id} variants={staggerItem}>
              <TeamCard team={team} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Stanton System Reference */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mt-8"
      >
        <StantonReference />
      </motion.div>

      {/* Recent Activity */}
      {stats.recentMapActivity && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-8 flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 bg-accent animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest text-text-muted uppercase">
            Latest map activity: {stats.recentMapActivity}
          </span>
        </motion.div>
      )}

      {/* System Status Footer */}
      <div className="mt-8 border-t border-border pt-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <StatusDot label="REALTIME" active />
          <StatusDot label="STORAGE" active />
          <StatusDot label="AUTH" active />
        </div>
        <span className="font-mono text-[9px] text-text-muted tracking-widest">
          MTC-OPS-CENTER
        </span>
      </div>
    </PageTransition>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "accent" | "amber";
}) {
  const colorMap = {
    accent: {
      border: "border-accent/20",
      text: "text-accent",
      glow: "shadow-[0_0_12px_rgba(0,255,204,0.08)]",
    },
    amber: {
      border: "border-amber/20",
      text: "text-amber",
      glow: "shadow-[0_0_12px_rgba(240,165,0,0.08)]",
    },
  };
  const c = colorMap[accent];

  return (
    <div
      className={`bg-bg-surface border ${c.border} ${c.glow} p-4 transition-all duration-200 hover:bg-bg-elevated`}
    >
      <p className="font-mono text-[9px] tracking-widest text-text-muted uppercase mb-1">
        {label}
      </p>
      <p className={`font-mono text-2xl font-bold ${c.text} tracking-wider`}>
        {value}
      </p>
    </div>
  );
}

function TeamCard({ team }: { team: TeamWithRole }) {
  const roleColor = ROLE_COLORS[team.my_role];
  const roleLabel = ROLE_LABELS[team.my_role];

  return (
    <Link href={`/dashboard/teams/${team.id}`} className="block group">
      <div className="mtc-panel bg-bg-surface p-5 transition-all duration-200 hover:bg-bg-elevated hover:border-accent/40 hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(0,255,204,0.1)] cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent/60" />
            <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
              Unit
            </span>
          </div>
          <span
            className="font-mono text-[9px] tracking-widest px-2 py-0.5 border"
            style={{ color: roleColor, borderColor: `${roleColor}40` }}
          >
            {roleLabel}
          </span>
        </div>

        {/* Team Name */}
        <h2 className="font-mono font-bold text-text-bright text-base tracking-wide mb-2 group-hover:text-accent transition-colors">
          {team.name}
        </h2>

        {/* Description */}
        {team.description && (
          <p className="text-sm text-text-dim leading-relaxed mb-3 line-clamp-2">
            {team.description}
          </p>
        )}

        {/* Footer Meta */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-text-muted"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="font-mono text-[10px] text-text-muted tracking-widest">
              {team.member_count} OPERATIVE
              {team.member_count !== 1 ? "S" : ""}
            </span>
          </div>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-text-muted group-hover:text-accent transition-colors"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="mtc-panel bg-bg-surface p-12 text-center"
    >
      <div className="mb-6 flex justify-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          className="text-text-muted opacity-40"
        >
          <rect
            x="4"
            y="4"
            width="40"
            height="40"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="4"
            y1="24"
            x2="44"
            y2="24"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            x1="24"
            y1="4"
            x2="24"
            y2="44"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="24"
            cy="24"
            r="6"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-2">
        No Units Registered
      </p>
      <p className="font-mono text-[11px] text-text-muted tracking-widest mb-6">
        Create a unit to begin tactical operations.
      </p>
      <Link href="/dashboard/teams/new" className="mtc-btn-primary text-sm">
        + REGISTER FIRST UNIT
      </Link>
    </motion.div>
  );
}

function StatusDot({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={[
          "w-1.5 h-1.5 rounded-full",
          active ? "bg-accent animate-pulse" : "bg-text-muted",
        ].join(" ")}
      />
      <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
        {label}
      </span>
    </div>
  );
}
