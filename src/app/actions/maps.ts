"use server";

import { createClient } from "@/utils/supabase/server";
import type { TacticalMap, ThreatLevel, Profile } from "@/types/database";

// ─── Create a map DB record (file already uploaded to Storage by client) ────

export interface CreateMapRecordInput {
  teamId: string;
  name: string;
  imagePath: string;
  gridType: "none" | "square" | "hex";
  gridSize?: number;
}

export interface MapActionResult {
  mapId?: string;
  error?: string;
}

export async function createMapRecord(
  input: CreateMapRecordInput
): Promise<MapActionResult> {
  const { teamId, name, imagePath, gridType, gridSize = 50 } = input;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Verify user is commander or planner for this team
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .in("role", ["commander", "planner"])
    .single();

  if (!membership) {
    return { error: "INSUFFICIENT CLEARANCE — COMMANDER OR PLANNER REQUIRED." };
  }

  const { data, error } = await supabase
    .from("maps")
    .insert({
      team_id: teamId,
      name: name.trim(),
      image_path: imagePath,
      grid_type: gridType,
      grid_size: gridSize,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "FAILED TO REGISTER MAP. TRY AGAIN." };
  }

  return { mapId: data.id };
}

// ─── Get all maps for a team ─────────────────────────────────────────────────

export async function getTeamMaps(
  teamId: string
): Promise<TacticalMap[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("maps")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as TacticalMap[];
}

// ─── Get a single map with a signed image URL ────────────────────────────────

export interface MapWithUrl extends TacticalMap {
  signedUrl: string | null;
}

export async function getMapWithSignedUrl(
  mapId: string
): Promise<MapWithUrl | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: map, error } = await supabase
    .from("maps")
    .select("*")
    .eq("id", mapId)
    .single();

  if (error || !map) return null;

  // Sign the image URL (24-hour expiry)
  const { data: signed } = await supabase.storage
    .from("map-assets")
    .createSignedUrl(map.image_path, 86400);

  return {
    ...(map as TacticalMap),
    signedUrl: signed?.signedUrl ?? null,
  };
}

// ─── Get all maps across all user's teams ───────────────────────────────────

export interface MapWithTeam extends TacticalMap {
  teams: { name: string };
  profiles: Pick<Profile, "callsign">;
}

export async function getAllMyMaps(): Promise<MapWithTeam[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get user's team IDs
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id);
  if (!memberships || memberships.length === 0) return [];

  const teamIds = memberships.map((m) => m.team_id);

  const { data, error } = await supabase
    .from("maps")
    .select("*, teams:team_id(name), profiles:created_by(callsign)")
    .in("team_id", teamIds)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data as MapWithTeam[];
}

// ─── Update map threat level ────────────────────────────────────────────────

export async function updateMapThreatLevel(
  mapId: string,
  threatLevel: ThreatLevel
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const { error } = await supabase
    .from("maps")
    .update({ threat_level: threatLevel })
    .eq("id", mapId);

  if (error) return { error: "FAILED TO UPDATE THREAT LEVEL." };
  return {};
}

// ─── Get a single team's info with the requesting user's role ────────────────

export interface TeamInfo {
  id: string;
  name: string;
  description: string | null;
  my_role: "commander" | "planner" | "operator";
  member_count: number;
}

export async function getTeamInfo(teamId: string): Promise<TeamInfo | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return null;

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, description")
    .eq("id", teamId)
    .single();

  if (!team) return null;

  const { count } = await supabase
    .from("team_members")
    .select("*", { count: "exact", head: true })
    .eq("team_id", teamId);

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    my_role: membership.role,
    member_count: count ?? 0,
  };
}
