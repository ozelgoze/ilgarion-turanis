"use client";

import { useState, useEffect } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { PartyNotification } from "@/types/database";
import PartyNotifications from "@/components/party-notifications";

interface TopBarProps {
  callsign: string;
  notifications: PartyNotification[];
}

export default function TopBar({ callsign, notifications }: TopBarProps) {
  return (
    <header className="h-10 shrink-0 bg-bg-surface border-b border-border flex items-center justify-between px-4">
      {/* Left: Status indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
            System Online
          </span>
        </div>
        <div className="w-px h-3 bg-border" />
        <span className="font-mono text-[10px] tracking-widest text-text-muted uppercase">
          Ilgarion Turanis [SCG] · Real-Time
        </span>
      </div>

      {/* Right: Notifications + User + Logout */}
      <div className="flex items-center gap-3">
        <PartyNotifications notifications={notifications} />

        <div className="w-px h-3 bg-border" />

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border border-accent/30 bg-accent/10 flex items-center justify-center">
            <span className="font-mono text-[9px] text-accent font-bold">
              {callsign.charAt(0)}
            </span>
          </div>
          <span className="font-mono text-[11px] tracking-widest text-text-primary uppercase">
            {callsign}
          </span>
        </div>

        <div className="w-px h-3 bg-border" />

        {/* Logout form */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="font-mono text-[10px] tracking-widest text-text-muted hover:text-danger uppercase transition-colors"
          >
            DISCONNECT
          </button>
        </form>
      </div>
    </header>
  );
}
