"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { TeamWithRole, TeamRole, TeamMemberWithProfile } from "@/types/database";

export interface TeamActionResult {
  error?: string;
}

/**
 * Create a new team. The creating user automatically becomes Commander
 * and is added to team_members.
 */
export async function createTeamAction(
  _prev: TeamActionResult,
  formData: FormData
): Promise<TeamActionResult> {
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name || name.length < 2) {
    return { error: "UNIT DESIGNATION REQUIRED (MIN 2 CHARS)." };
  }
  if (name.length > 64) {
    return { error: "UNIT DESIGNATION TOO LONG (MAX 64 CHARS)." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "AUTHENTICATION REQUIRED." };
  }

  // Ensure profile exists (the trigger should create it on signup,
  // but if it was missed we create it now)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const callsign =
      user.user_metadata?.callsign ??
      `OPERATOR-${user.id.slice(0, 6).toUpperCase()}`;
    const { error: profileErr } = await supabase
      .from("profiles")
      .insert({ id: user.id, callsign });
    if (profileErr) {
      return {
        error: `PROFILE SETUP FAILED: ${profileErr.message.toUpperCase()}`,
      };
    }
  }

  // Insert the team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ name, description, created_by: user.id })
    .select("id")
    .single();

  if (teamError || !team) {
    console.error("Team creation error:", teamError);
    return {
      error: teamError?.message
        ? `REGISTRATION FAILED: ${teamError.message.toUpperCase()}`
        : "FAILED TO REGISTER UNIT. TRY AGAIN.",
    };
  }

  // Add creator as commander
  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    role: "commander",
  });

  if (memberError) {
    console.error("Member insert error:", memberError);
    // Clean up the orphaned team
    await supabase.from("teams").delete().eq("id", team.id);
    return {
      error: memberError?.message
        ? `COMMAND ROLE FAILED: ${memberError.message.toUpperCase()}`
        : "FAILED TO ASSIGN COMMAND ROLE. TRY AGAIN.",
    };
  }

  redirect(`/dashboard/teams/${team.id}`);
}

/**
 * Fetch all teams the current user belongs to, with their role and member count.
 */
export async function getMyTeams(): Promise<TeamWithRole[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("team_members")
    .select(
      `
      role,
      teams (
        id, name, description, logo_url, created_by, created_at, updated_at,
        team_members ( count )
      )
    `
    )
    .eq("user_id", user.id);

  if (error || !data) return [];

  return data.map((row) => {
    const team = (
      Array.isArray(row.teams) ? row.teams[0] : row.teams
    ) as unknown as {
      id: string;
      name: string;
      description: string | null;
      logo_url: string | null;
      created_by: string;
      created_at: string;
      updated_at: string;
      team_members: Array<{ count: number }>;
    };
    return {
      ...team,
      my_role: row.role,
      member_count: team.team_members?.[0]?.count ?? 0,
    };
  });
}

// ─── Get team members with profiles ─────────────────────────────────────────

export async function getTeamMembers(
  teamId: string
): Promise<TeamMemberWithProfile[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("team_members")
    .select("*, profiles:user_id(id, callsign, avatar_url, created_at, updated_at)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

  if (error || !data) return [];
  return data as TeamMemberWithProfile[];
}

// ─── Add a member by callsign ───────────────────────────────────────────────

export async function addTeamMember(
  teamId: string,
  callsign: string,
  role: TeamRole = "operator"
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Only commanders can add members
  const { data: myMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("role", "commander")
    .single();
  if (!myMembership) return { error: "COMMANDER CLEARANCE REQUIRED." };

  // Look up the target user by callsign
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("callsign", callsign.trim())
    .single();
  if (!targetProfile) return { error: "OPERATIVE NOT FOUND — CHECK CALLSIGN." };

  // Check if already a member
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", teamId)
    .eq("user_id", targetProfile.id)
    .single();
  if (existing) return { error: "OPERATIVE ALREADY IN UNIT." };

  const { error } = await supabase.from("team_members").insert({
    team_id: teamId,
    user_id: targetProfile.id,
    role,
  });

  if (error) return { error: "FAILED TO ADD OPERATIVE." };
  return {};
}

// ─── Update a member's role ─────────────────────────────────────────────────

export async function updateMemberRole(
  memberId: string,
  newRole: TeamRole
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Get the membership to verify team + commander role
  const { data: target } = await supabase
    .from("team_members")
    .select("team_id, user_id")
    .eq("id", memberId)
    .single();
  if (!target) return { error: "MEMBERSHIP NOT FOUND." };

  // Prevent self-demotion
  if (target.user_id === user.id) return { error: "CANNOT MODIFY OWN ROLE." };

  const { data: myMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", target.team_id)
    .eq("user_id", user.id)
    .eq("role", "commander")
    .single();
  if (!myMembership) return { error: "COMMANDER CLEARANCE REQUIRED." };

  const { error } = await supabase
    .from("team_members")
    .update({ role: newRole })
    .eq("id", memberId);

  if (error) return { error: "FAILED TO UPDATE ROLE." };
  return {};
}

// ─── Remove a member ────────────────────────────────────────────────────────

export async function removeTeamMember(
  memberId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const { data: target } = await supabase
    .from("team_members")
    .select("team_id, user_id")
    .eq("id", memberId)
    .single();
  if (!target) return { error: "MEMBERSHIP NOT FOUND." };

  // Prevent self-removal
  if (target.user_id === user.id) return { error: "CANNOT REMOVE SELF." };

  const { data: myMembership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", target.team_id)
    .eq("user_id", user.id)
    .eq("role", "commander")
    .single();
  if (!myMembership) return { error: "COMMANDER CLEARANCE REQUIRED." };

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", memberId);

  if (error) return { error: "FAILED TO REMOVE OPERATIVE." };
  return {};
}
