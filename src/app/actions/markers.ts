"use server";

import { createClient } from "@/utils/supabase/server";
import type {
  TacticalMarker,
  MarkerType,
  MarkerAffiliation,
} from "@/types/database";

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getMapMarkers(mapId: string): Promise<TacticalMarker[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("tactical_markers")
    .select("*")
    .eq("map_id", mapId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as TacticalMarker[];
}

// ─── Create ──────────────────────────────────────────────────────────────────

export interface CreateMarkerInput {
  mapId: string;
  markerType: MarkerType;
  affiliation: MarkerAffiliation;
  x: number;
  y: number;
  label?: string;
  assignedTo?: string;
}

export async function createMarker(
  input: CreateMarkerInput
): Promise<{ marker?: TacticalMarker; error?: string }> {
  const { mapId, markerType, affiliation, x, y, label, assignedTo } = input;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Verify user can edit (commander or planner for this map's team)
  const { data: map } = await supabase
    .from("maps")
    .select("team_id")
    .eq("id", mapId)
    .single();
  if (!map) return { error: "MAP NOT FOUND." };

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", map.team_id)
    .eq("user_id", user.id)
    .in("role", ["commander", "planner"])
    .single();
  if (!membership) return { error: "INSUFFICIENT CLEARANCE." };

  const { data, error } = await supabase
    .from("tactical_markers")
    .insert({
      map_id: mapId,
      marker_type: markerType,
      affiliation,
      x,
      y,
      label: label ?? null,
      assigned_to: assignedTo ?? null,
      rotation: 0,
      scale: 1,
      metadata: {},
      placed_by: user.id,
    })
    .select("*")
    .single();

  if (error || !data) return { error: "FAILED TO PLACE MARKER." };
  return { marker: data as TacticalMarker };
}

// ─── Update position ─────────────────────────────────────────────────────────

export async function updateMarkerPosition(
  markerId: string,
  x: number,
  y: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const { error } = await supabase
    .from("tactical_markers")
    .update({ x, y })
    .eq("id", markerId);

  if (error) return { error: "FAILED TO UPDATE POSITION." };
  return {};
}

// ─── Update marker (label, assignment) ───────────────────────────────────────

export interface UpdateMarkerInput {
  markerId: string;
  label?: string | null;
  assignedTo?: string | null;
  labelSize?: number;
  /** Pass the last-known updated_at for optimistic concurrency control */
  expectedUpdatedAt?: string;
}

export async function updateMarker(
  input: UpdateMarkerInput
): Promise<{ marker?: TacticalMarker; error?: string }> {
  const { markerId, label, assignedTo, labelSize, expectedUpdatedAt } = input;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {};
  if (label !== undefined) payload.label = label;
  if (assignedTo !== undefined) payload.assigned_to = assignedTo;
  if (labelSize !== undefined) payload.label_size = labelSize;

  if (Object.keys(payload).length === 0) return { error: "NOTHING TO UPDATE." };

  // Optimistic concurrency: if caller provided expectedUpdatedAt, only
  // update if the row hasn't been modified since then.
  let query = supabase
    .from("tactical_markers")
    .update(payload)
    .eq("id", markerId);

  if (expectedUpdatedAt) {
    query = query.eq("updated_at", expectedUpdatedAt);
  }

  const { data, error } = await query.select("*").single();

  if (error?.code === "PGRST116" && expectedUpdatedAt) {
    // No rows matched — another user edited this marker concurrently
    return { error: "CONFLICT: Marker was modified by another user. Re-open the marker to see latest changes." };
  }
  if (error || !data) return { error: "FAILED TO UPDATE MARKER." };
  return { marker: data as TacticalMarker };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteMarker(
  markerId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const { error } = await supabase
    .from("tactical_markers")
    .delete()
    .eq("id", markerId);

  if (error) return { error: "FAILED TO DELETE MARKER." };
  return {};
}
