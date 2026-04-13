"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type { PartyMessageWithProfile } from "@/types/database";

interface UsePartyRealtimeParams {
  partyId: string;
  currentUserId: string;
  enabled?: boolean;
  onPartyChange?: () => void;
  onMembersChange?: () => void;
  onNewMessage?: (msg: PartyMessageWithProfile) => void;
}

/**
 * Subscribes to real-time changes on a party's tables:
 * - parties row changes (status updates)
 * - party_members inserts/deletes (join/leave/kick)
 * - party_messages inserts (chat)
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
      .channel(`party:${partyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parties",
          filter: `id=eq.${partyId}`,
        },
        () => {
          onPartyChangeRef.current?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_members",
          filter: `party_id=eq.${partyId}`,
        },
        () => {
          onMembersChangeRef.current?.();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "party_messages",
          filter: `party_id=eq.${partyId}`,
        },
        (payload) => {
          // postgres_changes won't include the joined profile, so we fetch it
          onNewMessageRef.current?.(payload.new as PartyMessageWithProfile);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [partyId, currentUserId, enabled]);
}
