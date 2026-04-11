"use server";

import { createClient } from "@/utils/supabase/server";
import type { MapDrawing, DrawingType } from "@/types/database";

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getMapDrawings(mapId: string): Promise<MapDrawing[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("map_drawings")
    .select("*")
    .eq("map_id", mapId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as MapDrawing[];
}

// ─── Create ──────────────────────────────────────────────────────────────────

export interface CreateDrawingInput {
  mapId: string;
  drawingType: DrawingType;
  points: Array<{ x: number; y: number }>;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown>;
}

export async function createDrawing(
  input: CreateDrawingInput
): Promise<{ drawing?: MapDrawing; error?: string }> {
  const {
    mapId,
    drawingType,
    points,
    strokeColor,
    strokeWidth,
    fillColor = null,
    label = null,
    metadata = {},
  } = input;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Verify user can edit (commander or planner)
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
    .from("map_drawings")
    .insert({
      map_id: mapId,
      drawing_type: drawingType,
      points,
      stroke_color: strokeColor,
      stroke_width: strokeWidth,
      fill_color: fillColor,
      label,
      metadata,
      drawn_by: user.id,
    })
    .select("*")
    .single();

  if (error || !data) return { error: "FAILED TO CREATE DRAWING." };
  return { drawing: data as MapDrawing };
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteDrawing(
  drawingId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const { error } = await supabase
    .from("map_drawings")
    .delete()
    .eq("id", drawingId);

  if (error) return { error: "FAILED TO DELETE DRAWING." };
  return {};
}
