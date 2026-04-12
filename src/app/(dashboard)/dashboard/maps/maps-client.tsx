"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import PageTransition, {
  staggerContainer,
  staggerItem,
} from "@/components/page-transition";
import type { MapWithTeam } from "@/app/actions/maps";

interface MapsClientProps {
  maps: MapWithTeam[];
}

export default function MapsClient({ maps }: MapsClientProps) {
  return (
    <PageTransition className="p-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-accent" />
            <h1 className="font-mono text-xs tracking-[0.3em] text-text-dim uppercase">
              Tactical Maps
            </h1>
          </div>
          <p className="font-mono text-[10px] text-text-muted tracking-widest pl-4">
            {maps.length} MAP{maps.length !== 1 ? "S" : ""} ACROSS ALL UNITS
          </p>
        </div>
      </div>

      {maps.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mtc-panel bg-bg-surface p-12 text-center"
        >
          <div className="mb-4 flex justify-center opacity-30">
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              className="text-text-muted"
            >
              <rect
                x="2"
                y="2"
                width="36"
                height="36"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <line
                x1="2"
                y1="20"
                x2="38"
                y2="20"
                stroke="currentColor"
                strokeWidth="1"
              />
              <line
                x1="20"
                y1="2"
                x2="20"
                y2="38"
                stroke="currentColor"
                strokeWidth="1"
              />
              <circle
                cx="20"
                cy="20"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-1">
            No Maps Available
          </p>
          <p className="font-mono text-[10px] text-text-muted tracking-widest">
            Maps are uploaded within team views. Join or create a unit to get
            started.
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {maps.map((map) => (
            <motion.div key={map.id} variants={staggerItem}>
              <MapCard map={map} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </PageTransition>
  );
}

function MapCard({ map }: { map: MapWithTeam }) {
  const updatedDate = new Date(map.updated_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Link href={`/dashboard/maps/${map.id}`} className="block group">
      <div className="mtc-panel bg-bg-surface p-5 transition-all duration-200 hover:bg-bg-elevated hover:border-accent/40 hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(0,255,204,0.1)] cursor-pointer">
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
              className="text-accent/60 shrink-0"
            >
              <polygon points="3,6 9,3 15,6 21,3 21,18 15,21 9,18 3,21" />
            </svg>
            <span className="font-mono text-[9px] tracking-widest text-text-dim uppercase">
              Tactical Map
            </span>
          </div>
          <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase truncate max-w-[100px]">
            {(map.teams as { name: string })?.name}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-mono font-bold text-text-bright text-sm tracking-wide mb-3 group-hover:text-accent transition-colors line-clamp-2">
          {map.name}
        </h3>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase">
              {map.grid_type === "none"
                ? "No Grid"
                : `${map.grid_type} Grid`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-text-muted tracking-widest">
              {updatedDate}
            </span>
            <svg
              width="10"
              height="10"
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
      </div>
    </Link>
  );
}
