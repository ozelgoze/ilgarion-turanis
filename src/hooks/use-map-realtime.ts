"use client";

import { useEffect, useRef, useMemo } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import type { TacticalMarker, MapDrawing } from "@/types/database";
import type { TacticalCanvasRef } from "@/components/canvas/tactical-canvas";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresenceUser {
  user_id: string;
  callsign: string;
  online_at: string;
}

/** Broadcast event types sent between clients on the same map channel */
export type MapBroadcastEvent =
  | { type: "marker_insert"; marker: TacticalMarker; sender: string }
  | { type: "marker_update"; id: string; x: number; y: number; sender: string }
  | { type: "marker_update_meta"; id: string; label: string | null; assignedCallsign: string | null; labelSize?: number; sender: string }
  | { type: "marker_delete"; id: string; sender: string }
  | { type: "drawing_insert"; drawing: MapDrawing; sender: string }
  | { type: "drawing_delete"; id: string; sender: string };

interface UseMapRealtimeParams {
  mapId: string;
  canvasRef: React.RefObject<TacticalCanvasRef | null>;
  currentUserId: string;
  currentCallsign: string;
  enabled?: boolean;
  onPresenceChange?: (users: PresenceUser[]) => void;
}

interface UseMapRealtimeReturn {
  /** Broadcast a map change to all other viewers on this channel */
  broadcast: (event: MapBroadcastEvent) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Subscribes to realtime changes via **broadcast** messages on the map channel.
 * Each client broadcasts its own changes after a successful DB write;
 * other clients receive the broadcast and apply it to the canvas.
 *
 * This avoids the RLS-filtered `postgres_changes` path, which can silently
 * drop events for non-commander roles whose security-definer policy chain
 * doesn't resolve in Supabase Realtime's WAL evaluation context.
 *
 * Also tracks presence of other viewers on the map.
 */
export function useMapRealtime({
  mapId,
  canvasRef,
  currentUserId,
  currentCallsign,
  enabled = true,
  onPresenceChange,
}: UseMapRealtimeParams): UseMapRealtimeReturn {
  // Keep the presence callback in a ref so effect doesn't re-run on change
  const presenceCbRef = useRef(onPresenceChange);
  useEffect(() => {
    presenceCbRef.current = onPresenceChange;
  }, [onPresenceChange]);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !mapId) return;

    const supabase = createClient();
    const channel: RealtimeChannel = supabase.channel(`map:${mapId}`, {
      config: {
        presence: { key: currentUserId },
        broadcast: { self: false }, // don't echo back our own broadcasts
      },
    });
    channelRef.current = channel;

    // ── Broadcast listener — receives changes from other clients ─────────
    channel.on("broadcast", { event: "map_change" }, (payload) => {
      const data = payload.payload as MapBroadcastEvent;
      if (!data) return;

      // Skip events from self (safety net — self:false should handle this)
      if (data.sender === currentUserId) return;

      const ref = canvasRef.current;
      if (!ref) return;

      switch (data.type) {
        case "marker_insert":
          if (!ref.hasMarker(data.marker.id)) {
            ref.addMarker(data.marker);
          }
          break;
        case "marker_update":
          if (ref.hasMarker(data.id)) {
            ref.updateMarkerPos(data.id, data.x, data.y);
          }
          break;
        case "marker_update_meta":
          ref.updateMarkerMeta(data.id, data.label, data.assignedCallsign, data.labelSize);
          break;
        case "marker_delete":
          ref.removeMarker(data.id);
          break;
        case "drawing_insert":
          if (!ref.hasDrawing(data.drawing.id)) {
            ref.addDrawing(data.drawing);
          }
          break;
        case "drawing_delete":
          ref.removeDrawing(data.id);
          break;
      }
    });

    // ── Also keep postgres_changes as fallback (for users who reload mid-session)
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
          ref.addMarker(marker);
        }
      }
    );

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

    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: "INSERT",
        schema: "public",
        table: "map_drawings",
        filter: `map_id=eq.${mapId}`,
      },
      (payload: { new: MapDrawing }) => {
        const drawing = payload.new;
        const ref = canvasRef.current;
        if (!ref) return;
        if (ref.hasDrawing(drawing.id)) return;
        ref.addDrawing(drawing);
      }
    );

    channel.on(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "postgres_changes" as any,
      {
        event: "DELETE",
        schema: "public",
        table: "map_drawings",
        filter: `map_id=eq.${mapId}`,
      },
      (payload: { old: { id: string } }) => {
        const id = payload.old?.id;
        if (!id) return;
        const ref = canvasRef.current;
        if (!ref) return;
        ref.removeDrawing(id);
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
      channelRef.current = null;
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [mapId, enabled, currentUserId, currentCallsign, canvasRef]);

  // Stable broadcast function
  const broadcast = useMemo(() => {
    return (event: MapBroadcastEvent) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "map_change",
        payload: event,
      });
    };
  }, []);

  return { broadcast };
}
