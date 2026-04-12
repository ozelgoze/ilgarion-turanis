"use server";

import { createClient } from "@/utils/supabase/server";
import type { Profile } from "@/types/database";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function updateCallsign(
  callsign: string
): Promise<{ error?: string }> {
  const trimmed = callsign.trim();
  if (!trimmed || trimmed.length < 2) {
    return { error: "CALLSIGN MUST BE AT LEAST 2 CHARACTERS." };
  }
  if (trimmed.length > 32) {
    return { error: "CALLSIGN TOO LONG (MAX 32 CHARS)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const { error } = await supabase
    .from("profiles")
    .update({ callsign: trimmed })
    .eq("id", user.id);

  if (error) return { error: "FAILED TO UPDATE CALLSIGN." };
  return {};
}

export async function updateScProfile(fields: {
  sc_handle?: string;
  primary_ship?: string;
  sc_org?: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const update: Record<string, string | null> = {};
  if (fields.sc_handle !== undefined) {
    const trimmed = fields.sc_handle.trim();
    update.sc_handle = trimmed || null;
  }
  if (fields.primary_ship !== undefined) {
    const trimmed = fields.primary_ship.trim();
    update.primary_ship = trimmed || null;
  }
  if (fields.sc_org !== undefined) {
    const trimmed = fields.sc_org.trim();
    update.sc_org = trimmed || null;
  }

  if (Object.keys(update).length === 0) return {};

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) return { error: "FAILED TO UPDATE SC PROFILE." };
  return {};
}
