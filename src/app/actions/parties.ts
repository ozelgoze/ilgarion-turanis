"use server";

import { createClient } from "@/utils/supabase/server";
import type { PartyActivity, PartyStatus, PartyWithDetails, PartyMessageWithProfile, PartyNotification, PartyNotificationType } from "@/types/database";

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getCallsign(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("callsign").eq("id", userId).single();
  return data?.callsign ?? "UNKNOWN";
}

async function getPartyTitle(partyId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("parties").select("title").eq("id", partyId).single();
  return data?.title ?? "Unknown Party";
}

// ─── Create a Party ─────────────────────────────────────────────────────────

export async function createParty(fields: {
  activity: PartyActivity;
  title: string;
  description?: string;
  minPlayers?: number;
  maxPlayers?: number;
  region?: string;
  voiceChat?: string;
}): Promise<{ party?: { id: string }; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const title = fields.title.trim();
  if (!title || title.length < 3) return { error: "TITLE MUST BE AT LEAST 3 CHARACTERS." };
  if (title.length > 80) return { error: "TITLE TOO LONG (MAX 80 CHARS)." };

  const { data, error } = await supabase
    .from("parties")
    .insert({
      creator_id: user.id,
      activity: fields.activity,
      title,
      description: fields.description?.trim() || null,
      min_players: fields.minPlayers ?? 2,
      max_players: fields.maxPlayers ?? 4,
      region: fields.region?.trim() || "any",
      voice_chat: fields.voiceChat?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "FAILED TO CREATE PARTY." };

  // Auto-join creator
  await supabase.from("party_members").insert({
    party_id: data.id,
    user_id: user.id,
  });

  return { party: { id: data.id } };
}

// ─── Get Open Parties (with search/filter) ──────────────────────────────────

export async function searchParties(filters?: {
  activity?: PartyActivity;
  search?: string;
  status?: PartyStatus;
  region?: string;
  sort?: "newest" | "oldest" | "spots";
}): Promise<PartyWithDetails[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("parties")
    .select(`
      *,
      creator:creator_id(id, callsign, sc_handle, primary_ship),
      members:party_members(id, user_id, joined_at, profiles:user_id(id, callsign, sc_handle, primary_ship))
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (filters?.activity && filters.activity !== "other") {
    query = query.eq("activity", filters.activity);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    // Default: show open and in_progress
    query = query.in("status", ["open", "in_progress"]);
  }
  if (filters?.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }
  if (filters?.region && filters.region !== "any") {
    query = query.eq("region", filters.region);
  }
  if (filters?.sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (filters?.sort === "spots") {
    query = query.order("max_players", { ascending: false });
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as unknown as PartyWithDetails[]).map((p) => ({
    ...p,
    member_count: p.members?.length ?? 0,
  }));
}

// ─── Get a Single Party ─────────────────────────────────────────────────────

export async function getParty(partyId: string): Promise<PartyWithDetails | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("parties")
    .select(`
      *,
      creator:creator_id(id, callsign, sc_handle, primary_ship),
      members:party_members(id, user_id, joined_at, profiles:user_id(id, callsign, sc_handle, primary_ship))
    `)
    .eq("id", partyId)
    .single();

  if (error || !data) return null;

  const party = data as unknown as PartyWithDetails;
  return { ...party, member_count: party.members?.length ?? 0 };
}

// ─── Get My Parties ─────────────────────────────────────────────────────────

export async function getMyParties(): Promise<PartyWithDetails[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Parties I created or am a member of
  const { data: memberOf } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id);

  const partyIds = memberOf?.map((m) => m.party_id) ?? [];
  if (partyIds.length === 0) return [];

  const { data, error } = await supabase
    .from("parties")
    .select(`
      *,
      creator:creator_id(id, callsign, sc_handle, primary_ship),
      members:party_members(id, user_id, joined_at, profiles:user_id(id, callsign, sc_handle, primary_ship))
    `)
    .in("id", partyIds)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as PartyWithDetails[]).map((p) => ({
    ...p,
    member_count: p.members?.length ?? 0,
  }));
}

// ─── Join a Party ───────────────────────────────────────────────────────────

export async function joinParty(partyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Check party exists and is open
  const { data: party } = await supabase
    .from("parties")
    .select("id, status, max_players")
    .eq("id", partyId)
    .single();

  if (!party) return { error: "PARTY NOT FOUND." };
  if (party.status !== "open") return { error: "PARTY IS NO LONGER ACCEPTING MEMBERS." };

  // Check not already a member
  const { data: existing } = await supabase
    .from("party_members")
    .select("id")
    .eq("party_id", partyId)
    .eq("user_id", user.id)
    .single();

  if (existing) return { error: "ALREADY IN THIS PARTY." };

  // Check member count
  const { count } = await supabase
    .from("party_members")
    .select("id", { count: "exact", head: true })
    .eq("party_id", partyId);

  if (count !== null && count >= party.max_players) {
    // Auto-set to full
    await supabase.from("parties").update({ status: "full" }).eq("id", partyId);
    return { error: "PARTY IS FULL." };
  }

  // Join
  const { error } = await supabase.from("party_members").insert({
    party_id: partyId,
    user_id: user.id,
  });

  if (error) return { error: "FAILED TO JOIN PARTY." };

  // Check if now full
  const { count: newCount } = await supabase
    .from("party_members")
    .select("id", { count: "exact", head: true })
    .eq("party_id", partyId);

  if (newCount !== null && newCount >= party.max_players) {
    await supabase.from("parties").update({ status: "full" }).eq("id", partyId);
  }

  // Notify party members
  const [callsign, title] = await Promise.all([getCallsign(user.id), getPartyTitle(partyId)]);
  await notifyPartyMembers(partyId, user.id, "member_joined", callsign, title);

  return {};
}

// ─── Leave a Party ──────────────────────────────────────────────────────────

export async function leaveParty(partyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Check if creator — creators close instead of leaving
  const { data: party } = await supabase
    .from("parties")
    .select("creator_id")
    .eq("id", partyId)
    .single();

  if (party?.creator_id === user.id) {
    return { error: "PARTY CREATOR MUST CLOSE THE PARTY INSTEAD OF LEAVING." };
  }

  const { error } = await supabase
    .from("party_members")
    .delete()
    .eq("party_id", partyId)
    .eq("user_id", user.id);

  if (error) return { error: "FAILED TO LEAVE PARTY." };

  // If party was full, reopen it
  const { data: currentParty } = await supabase
    .from("parties")
    .select("status, title")
    .eq("id", partyId)
    .single();

  if (currentParty?.status === "full") {
    await supabase.from("parties").update({ status: "open" }).eq("id", partyId);
  }

  // Notify remaining members
  const callsign = await getCallsign(user.id);
  await notifyPartyMembers(partyId, user.id, "member_left", callsign, currentParty?.title ?? "Party");
  await notifyPartyCreator(partyId, user.id, "member_left", callsign, currentParty?.title ?? "Party");

  return {};
}

// ─── Update Party Status ────────────────────────────────────────────────────

export async function updatePartyStatus(
  partyId: string,
  status: PartyStatus
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const { error } = await supabase
    .from("parties")
    .update({ status })
    .eq("id", partyId)
    .eq("creator_id", user.id);

  if (error) return { error: "FAILED TO UPDATE PARTY STATUS." };

  // Notify on mission start
  if (status === "in_progress") {
    const [callsign, title] = await Promise.all([getCallsign(user.id), getPartyTitle(partyId)]);
    await notifyPartyMembers(partyId, user.id, "party_started", callsign, title);
  }

  return {};
}

// ─── Delete / Close a Party ─────────────────────────────────────────────────

export async function closeParty(partyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Get title before closing
  const title = await getPartyTitle(partyId);
  const callsign = await getCallsign(user.id);

  // Notify before closing (members still exist)
  await notifyPartyMembers(partyId, user.id, "party_closed", callsign, title);

  const { error } = await supabase
    .from("parties")
    .update({ status: "closed" })
    .eq("id", partyId)
    .eq("creator_id", user.id);

  if (error) return { error: "FAILED TO CLOSE PARTY." };
  return {};
}

// ─── Kick a Member (Creator Only) ──────────────────────────────────────────

export async function kickMember(
  partyId: string,
  targetUserId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Verify caller is the creator
  const { data: party } = await supabase
    .from("parties")
    .select("creator_id, status")
    .eq("id", partyId)
    .single();

  if (!party) return { error: "PARTY NOT FOUND." };
  if (party.creator_id !== user.id) return { error: "ONLY THE PARTY LEADER CAN KICK MEMBERS." };
  if (targetUserId === user.id) return { error: "CANNOT KICK YOURSELF." };

  // Get info for notification before deleting
  const [kickedCallsign, title] = await Promise.all([getCallsign(targetUserId), getPartyTitle(partyId)]);

  const { error } = await supabase
    .from("party_members")
    .delete()
    .eq("party_id", partyId)
    .eq("user_id", targetUserId);

  if (error) return { error: "FAILED TO KICK MEMBER." };

  // Reopen if was full
  if (party.status === "full") {
    await supabase.from("parties").update({ status: "open" }).eq("id", partyId);
  }

  // Notify the kicked user directly
  await supabase.from("party_notifications").insert({
    user_id: targetUserId,
    party_id: partyId,
    type: "member_kicked",
    actor_callsign: kickedCallsign,
    party_title: title,
  });

  // Notify remaining members
  await notifyPartyMembers(partyId, user.id, "member_kicked", kickedCallsign, title);

  return {};
}

// ─── Party Chat — Send Message ─────────────────────────────────────────────

export async function sendPartyMessage(
  partyId: string,
  content: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const trimmed = content.trim();
  if (!trimmed) return { error: "MESSAGE CANNOT BE EMPTY." };
  if (trimmed.length > 500) return { error: "MESSAGE TOO LONG (MAX 500 CHARS)." };

  const { error } = await supabase.from("party_messages").insert({
    party_id: partyId,
    user_id: user.id,
    content: trimmed,
  });

  if (error) return { error: "FAILED TO SEND MESSAGE." };
  return {};
}

// ─── Party Chat — Get Messages ─────────────────────────────────────────────

// ─── Auto-Expire Stale Parties ─────────────────────────────────────────────
// Closes parties that have been open/in_progress for over 24 hours with no updates.
// Called on page load to keep the listing clean.

export async function expireStaleParties(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("parties")
    .update({ status: "closed" as PartyStatus })
    .in("status", ["open", "in_progress"])
    .lt("updated_at", cutoff);
}

// ─── Party Chat — Get Messages ─────────────────────────────────────────────

export async function getPartyMessages(
  partyId: string,
  limit = 50
): Promise<PartyMessageWithProfile[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("party_messages")
    .select(`*, profiles:user_id(id, callsign)`)
    .eq("party_id", partyId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as PartyMessageWithProfile[];
}

// ─── Notification Helpers ──────────────────────────────────────────────────

/** Notify all members of a party except the actor */
async function notifyPartyMembers(
  partyId: string,
  excludeUserId: string,
  type: PartyNotificationType,
  actorCallsign: string,
  partyTitle: string,
) {
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("party_members")
    .select("user_id")
    .eq("party_id", partyId);

  if (!members || members.length === 0) return;

  const notifications = members
    .filter((m) => m.user_id !== excludeUserId)
    .map((m) => ({
      user_id: m.user_id,
      party_id: partyId,
      type,
      actor_callsign: actorCallsign,
      party_title: partyTitle,
    }));

  if (notifications.length > 0) {
    await supabase.from("party_notifications").insert(notifications);
  }
}

/** Also notify the party creator if they're not already in the member list notification */
async function notifyPartyCreator(
  partyId: string,
  excludeUserId: string,
  type: PartyNotificationType,
  actorCallsign: string,
  partyTitle: string,
) {
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select("creator_id")
    .eq("id", partyId)
    .single();

  if (!party || party.creator_id === excludeUserId) return;

  await supabase.from("party_notifications").insert({
    user_id: party.creator_id,
    party_id: partyId,
    type,
    actor_callsign: actorCallsign,
    party_title: partyTitle,
  });
}

// ─── Get My Notifications ──────────────────────────────────────────────────

export async function getMyPartyNotifications(limit = 20): Promise<PartyNotification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("party_notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as PartyNotification[];
}

// ─── Mark Notifications as Read ────────────────────────────────────────────

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("party_notifications")
    .update({ read: true })
    .in("id", ids)
    .eq("user_id", user.id);
}

// ─── Clear All Notifications ───────────────────────────────────────────────

export async function clearAllNotifications(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("party_notifications")
    .delete()
    .eq("user_id", user.id);
}

// ─── Edit Party (Creator Only) ─────────────────────────────────────────────

export async function editParty(
  partyId: string,
  fields: { title?: string; description?: string; maxPlayers?: number; voiceChat?: string; region?: string }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const updates: Record<string, unknown> = {};
  if (fields.title !== undefined) {
    const t = fields.title.trim();
    if (t.length < 3) return { error: "TITLE MUST BE AT LEAST 3 CHARACTERS." };
    if (t.length > 80) return { error: "TITLE TOO LONG (MAX 80 CHARS)." };
    updates.title = t;
  }
  if (fields.description !== undefined) updates.description = fields.description.trim() || null;
  if (fields.maxPlayers !== undefined) updates.max_players = fields.maxPlayers;
  if (fields.voiceChat !== undefined) updates.voice_chat = fields.voiceChat.trim() || null;
  if (fields.region !== undefined) updates.region = fields.region.trim() || "any";

  if (Object.keys(updates).length === 0) return {};

  const { error } = await supabase
    .from("parties")
    .update(updates)
    .eq("id", partyId)
    .eq("creator_id", user.id);

  if (error) return { error: "FAILED TO UPDATE PARTY." };
  return {};
}
