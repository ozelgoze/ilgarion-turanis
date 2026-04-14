"use server";

import { createClient } from "@/utils/supabase/server";
import type { HangarShip } from "@/types/database";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ─── Read ───────────────────────────────────────────────────────────────────

/** Get all ships in the current user's hangar */
export async function getMyHangar(): Promise<HangarShip[]> {
  const { supabase, user } = await getAuthUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_hangars")
    .select("*")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return [];
  return data as HangarShip[];
}

/** Get a specific user's hangar (for team roster display) */
export async function getUserHangar(userId: string): Promise<HangarShip[]> {
  const { supabase, user } = await getAuthUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("user_hangars")
    .select("*")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return [];
  return data as HangarShip[];
}

/** Get primary ship for a user */
export async function getUserPrimaryShip(userId: string): Promise<string | null> {
  const { supabase, user } = await getAuthUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_hangars")
    .select("ship_name")
    .eq("user_id", userId)
    .eq("is_primary", true)
    .single();

  return data?.ship_name ?? null;
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function addShipToHangar(input: {
  ship_name: string;
  nickname?: string;
  is_primary?: boolean;
  erkul_link?: string;
  insurance?: string;
  notes?: string;
}): Promise<{ error?: string; ship?: HangarShip }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("user_hangars")
    .insert({
      user_id: user.id,
      ship_name: input.ship_name,
      nickname: input.nickname || null,
      is_primary: input.is_primary ?? false,
      erkul_link: input.erkul_link || null,
      insurance: input.insurance || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `${input.ship_name} is already in your hangar.` };
    }
    return { error: error.message };
  }

  return { ship: data as HangarShip };
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateHangarShip(
  hangarId: string,
  updates: {
    nickname?: string | null;
    is_primary?: boolean;
    erkul_link?: string | null;
    insurance?: string | null;
    notes?: string | null;
  }
): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_hangars")
    .update(updates)
    .eq("id", hangarId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}

/** Set a ship as the primary (main) ship */
export async function setPrimaryShip(hangarId: string): Promise<{ error?: string }> {
  return updateHangarShip(hangarId, { is_primary: true });
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function removeShipFromHangar(hangarId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_hangars")
    .delete()
    .eq("id", hangarId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}
