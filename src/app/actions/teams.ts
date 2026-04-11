"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { TeamWithRole } from "@/types/database";

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

  // Insert the team
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ name, description, created_by: user.id })
    .select("id")
    .single();

  if (teamError || !team) {
    return { error: "FAILED TO REGISTER UNIT. TRY AGAIN." };
  }

  // Add creator as commander
  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: user.id,
    role: "commander",
  });

  if (memberError) {
    // Clean up the orphaned team
    await supabase.from("teams").delete().eq("id", team.id);
    return { error: "FAILED TO ASSIGN COMMAND ROLE. TRY AGAIN." };
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
