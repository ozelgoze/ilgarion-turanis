"use server";

import { createClient } from "@/utils/supabase/server";
import type { Briefing } from "@/types/database";

// ─── Extended type with creator callsign ────────────────────────────────────

export interface BriefingWithCreator extends Briefing {
  profiles: { callsign: string };
}

// ─── List briefings for a team ──────────────────────────────────────────────

export async function getTeamBriefings(
  teamId: string
): Promise<BriefingWithCreator[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("briefings")
    .select("*, profiles:created_by(callsign)")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as BriefingWithCreator[];
}

// ─── Get a single briefing ──────────────────────────────────────────────────

export async function getBriefing(
  briefingId: string
): Promise<BriefingWithCreator | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("briefings")
    .select("*, profiles:created_by(callsign)")
    .eq("id", briefingId)
    .single();

  if (error || !data) return null;
  return data as BriefingWithCreator;
}

// ─── Create ─────────────────────────────────────────────────────────────────

export interface CreateBriefingInput {
  teamId: string;
  title: string;
  content?: string | null;
  embedUrl?: string | null;
  mapId?: string | null;
}

export async function createBriefing(
  input: CreateBriefingInput
): Promise<{ briefing?: Briefing; error?: string }> {
  const {
    teamId,
    title,
    content = null,
    embedUrl = null,
    mapId = null,
  } = input;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Verify commander or planner
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .in("role", ["commander", "planner"])
    .single();
  if (!membership) return { error: "INSUFFICIENT CLEARANCE." };

  const { data, error } = await supabase
    .from("briefings")
    .insert({
      team_id: teamId,
      title: title.trim(),
      content,
      embed_url: embedUrl,
      map_id: mapId,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !data) return { error: "FAILED TO CREATE BRIEFING." };
  return { briefing: data as Briefing };
}

// ─── Update ─────────────────────────────────────────────────────────────────

export interface UpdateBriefingInput {
  briefingId: string;
  title?: string;
  content?: string | null;
  embedUrl?: string | null;
}

export async function updateBriefing(
  input: UpdateBriefingInput
): Promise<{ error?: string }> {
  const { briefingId, title, content, embedUrl } = input;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Build the update payload (only include provided fields)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {};
  if (title !== undefined) payload.title = title.trim();
  if (content !== undefined) payload.content = content;
  if (embedUrl !== undefined) payload.embed_url = embedUrl;

  if (Object.keys(payload).length === 0) return {};

  const { error } = await supabase
    .from("briefings")
    .update(payload)
    .eq("id", briefingId);

  if (error) return { error: "FAILED TO UPDATE BRIEFING." };
  return {};
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteBriefing(
  briefingId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const { error } = await supabase
    .from("briefings")
    .delete()
    .eq("id", briefingId);

  if (error) return { error: "FAILED TO DELETE BRIEFING." };
  return {};
}
