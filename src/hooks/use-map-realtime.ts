"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type { TacticalMarker } from "@/types/database";
import type { TacticalCanvasRef } from "@/components/canvas/tactical-canvas";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceUser {
  user_id: string;
  callsign: string;
  online_at: string;
}

interface UseMapRealtimeParams {
  mapId: string;
  canvasRef: React.RefObject<TacticalCanvasRef | null>;
  currentUserId: string;
  currentCallsign: string;
  enabled?: boolean;
  onPresenceChange?: (users: PresenceUser[]) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Subscribes to realtime changes on `tactical_markers` for a given map,
 * applying INSERT/UPDATE/DELETE events to the Fabric canvas via the ref.
 *
 * Dedup is handled at the canvas level:
 *   - `hasMarker(id)`  → skip INSERTs we already know about
 *   - `addMarker(...)` → adopts any "pending" fabric object at matching
 *                        coordinates, so the local optimistic drop and the
 *                        incoming server event don't produce duplicates.
 *
 * Also tracks presence of other viewers on the map (callsign + online_at).
 */
export function useMapRealtime({
  mapId,
  canvasRef,
  currentUserId,
  currentCallsign,
  enabled = true,
  onPresenceChange,
}: UseMapRealtimeParams): void {
  // Keep the presence callback in a ref so effect doesn't re-run on change
  const presenceCbRef = useRef(onPresenceChange);
  useEffect(() => {
    presenceCbRef.current = onPresenceChange;
  }, [onPresenceChange]);

  useEffect(() => {
    if (!enabled || !mapId) return;

    const supabase = createClient();
    const channel: RealtimeChannel = supabase.channel(`map:${mapId}`, {
      config: {
        presence: { key: currentUserId },
      },
    });

    // ── Marker INSERT ────────────────────────────────────────────────────
    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table: "tactical_markers",
        filter: `map_id=eq.${mapId}`,
      },
      (payload: { new: TacticalMarker }) => {
        const marker = payload.new;
        const ref = canvasRef.current;
        if (!ref) return;
        if (ref.hasMarker(marker.id)) return;
        ref.addMarker(marker);
      }
    );

    // ── Marker UPDATE ────────────────────────────────────────────────────
    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: "UPDATE",
        schema: "public",
        table: "tactical_markers",
        filter: `map_id=eq.${mapId}`,
      },
      (payload: { new: TacticalMarker }) => {
        const marker = payload.new;
        const ref = canvasRef.current;
        if (!ref) return;
        if (ref.hasMarker(marker.id)) {
          ref.updateMarkerPos(marker.id, marker.x, marker.y);
        } else {
          // Rare: we missed the INSERT — just add it
          ref.addMarker(marker);
        }
      }
    );

    // ── Marker DELETE ────────────────────────────────────────────────────
    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: "DELETE",
        schema: "public",
        table: "tactical_markers",
        filter: `map_id=eq.${mapId}`,
      },
      (payload: { old: { id: string } }) => {
        const id = payload.old?.id;
        if (!id) return;
        const ref = canvasRef.current;
        if (!ref) return;
        ref.removeMarker(id);
      }
    );

    // ── Presence sync ────────────────────────────────────────────────────
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      const users: PresenceUser[] = [];
      for (const key of Object.keys(state)) {
        for (const entry of state[key]) {
          users.push(entry);
        }
      }
      presenceCbRef.current?.(users);
    });

    // ── Subscribe & track self ───────────────────────────────────────────
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: currentUserId,
          callsign: currentCallsign,
          online_at: new Date().toISOString(),
        } satisfies PresenceUser);
      }
    });

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [mapId, enabled, currentUserId, currentCallsign, canvasRef]);
}
