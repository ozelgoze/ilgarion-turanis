"use client";

import { useEffect, useRef, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

type PartyBroadcastEvent =
  | { type: "party_message"; sender: string }
  | { type: "party_update"; sender: string }
  | { type: "members_change"; sender: string };

interface UsePartyRealtimeParams {
  partyId: string;
  currentUserId: string;
  enabled?: boolean;
  onPartyChange?: () => void;
  onMembersChange?: () => void;
  onNewMessage?: () => void;
}

/**
 * Subscribes to a broadcast channel for a party.
 * Uses broadcast (not postgres_changes) to avoid RLS/WAL issues.
 * Also keeps postgres_changes as fallback for party/member table changes.
 */
export function usePartyRealtime({
  partyId,
  currentUserId,
  enabled = true,
  onPartyChange,
  onMembersChange,
  onNewMessage,
}: UsePartyRealtimeParams) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onPartyChangeRef = useRef(onPartyChange);
  const onMembersChangeRef = useRef(onMembersChange);
  const onNewMessageRef = useRef(onNewMessage);

  onPartyChangeRef.current = onPartyChange;
  onMembersChangeRef.current = onMembersChange;
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    if (!enabled || !partyId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`party:${partyId}`, { config: { broadcast: { self: false } } })
      // Primary: Broadcast events (reliable, not affected by RLS)
      .on("broadcast", { event: "party_event" }, ({ payload }) => {
        const evt = payload as PartyBroadcastEvent;
        if (evt.sender === currentUserId) return; // skip own events
        switch (evt.type) {
          case "party_message":
            onNewMessageRef.current?.();
            break;
          case "party_update":
            onPartyChangeRef.current?.();
            break;
          case "members_change":
            onMembersChangeRef.current?.();
            break;
        }
      })
      // Fallback: postgres_changes for party status (may work for some events)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parties", filter: `id=eq.${partyId}` },
        () => { onPartyChangeRef.current?.(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "party_members", filter: `party_id=eq.${partyId}` },
        () => { onMembersChangeRef.current?.(); }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [partyId, currentUserId, enabled]);

  /** Broadcast an event to all other clients on this party channel */
  const broadcast = useCallback(
    (event: PartyBroadcastEvent) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "party_event",
        payload: event,
      });
    },
    []
  );

  return { broadcast };
}
