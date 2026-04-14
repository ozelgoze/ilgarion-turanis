"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  PARTY_NOTIFICATION_LABELS,
  type PartyNotification,
  type PartyNotificationType,
} from "@/types/database";
import { markNotificationsRead, clearAllNotifications, getMyPartyNotifications } from "@/app/actions/parties";
import { createClient } from "@/utils/supabase/client";

interface Props {
  notifications: PartyNotification[];
  userId: string;
  onDismiss?: () => void;
}

export default function PartyNotifications({ notifications: initial, userId, onDismiss }: Props) {
  const [notifications, setNotifications] = useState(initial);
  const [open, setOpen] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Refresh notifications from DB
  const refresh = useCallback(async () => {
    const fresh = await getMyPartyNotifications();
    setNotifications(fresh);
  }, []);

  // Subscribe to global notification broadcast channel
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("party-notifications", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "new_notification" }, (msg) => {
        // Only refresh if this user is in the target list
        const targets: string[] | undefined = msg.payload?.targetUserIds;
        if (!targets || targets.includes(userId)) {
          refresh();
        }
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, refresh]);

  async function handleOpen() {
    setOpen(!open);
    if (!open && unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      await markNotificationsRead(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  async function handleClearAll() {
    await clearAllNotifications();
    setNotifications([]);
    setOpen(false);
    onDismiss?.();
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative mtc-btn-ghost px-2 py-1.5"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-dim">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger flex items-center justify-center">
            <span className="font-mono text-[8px] text-white font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-bg-surface border border-border shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
              Notifications
            </span>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="font-mono text-[8px] tracking-widest text-text-muted hover:text-danger uppercase transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <p className="font-mono text-[10px] text-text-muted/50 tracking-widest">
                  No notifications
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = PARTY_NOTIFICATION_LABELS[n.type as PartyNotificationType];
                return (
                  <Link
                    key={n.id}
                    href={`/dashboard/parties/${n.party_id}`}
                    onClick={() => setOpen(false)}
                    className={[
                      "block px-3 py-2.5 border-b border-border/50 transition-colors hover:bg-bg-elevated",
                      !n.read ? "bg-accent/5" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="w-1.5 h-1.5 mt-1.5 shrink-0"
                        style={{ backgroundColor: meta?.color ?? "#666" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[10px] text-text-dim tracking-wide leading-relaxed">
                          <span className="text-text-bright">{n.actor_callsign}</span>
                          {" "}{meta?.verb ?? n.type}{" "}
                          <span className="text-accent/80">{n.party_title}</span>
                        </p>
                        <span className="font-mono text-[8px] text-text-muted/50 tracking-widest">
                          {getTimeAgo(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
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
