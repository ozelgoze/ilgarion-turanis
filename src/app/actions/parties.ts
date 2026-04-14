"use server";

import { createClient } from "@/utils/supabase/server";
import type { PartyActivity, PartyStatus, PartyOutcome, PartyWithDetails, PartyMessageWithProfile, PartyNotification, PartyNotificationType, PartyEvent, LeaderReputation, PublicPartyListing } from "@/types/database";

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

async function logPartyEvent(
  partyId: string,
  userId: string | null,
  eventType: string,
  detail: string | null = null,
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("party_events").insert({
    party_id: partyId,
    user_id: userId,
    event_type: eventType,
    detail,
  });
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
  passcode?: string;
  startingStation?: string;
}): Promise<{ party?: { id: string }; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const title = fields.title.trim();
  if (!title || title.length < 3) return { error: "TITLE MUST BE AT LEAST 3 CHARACTERS." };
  if (title.length > 80) return { error: "TITLE TOO LONG (MAX 80 CHARS)." };

  const passcode = fields.passcode?.trim() || null;
  if (passcode && (passcode.length < 3 || passcode.length > 20)) {
    return { error: "PASSCODE MUST BE 3-20 CHARACTERS." };
  }

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
      passcode,
      starting_station: fields.startingStation?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "FAILED TO CREATE PARTY." };

  // Auto-join creator
  await supabase.from("party_members").insert({
    party_id: data.id,
    user_id: user.id,
  });

  const callsign = await getCallsign(user.id);
  await logPartyEvent(data.id, user.id, "created", `${callsign} created the party`);

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
      members:party_members(id, user_id, ready, joined_at, profiles:user_id(id, callsign, sc_handle, primary_ship))
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
    // Never expose raw passcode to listing — use masked flag instead
    passcode: p.passcode ? "***" : null,
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
      members:party_members(id, user_id, ready, joined_at, profiles:user_id(id, callsign, sc_handle, primary_ship))
    `)
    .eq("id", partyId)
    .single();

  if (error || !data) return null;

  const party = data as unknown as PartyWithDetails;
  return { ...party, passcode: party.passcode ? "***" : null, member_count: party.members?.length ?? 0 };
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
      members:party_members(id, user_id, ready, joined_at, profiles:user_id(id, callsign, sc_handle, primary_ship))
    `)
    .in("id", partyIds)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as PartyWithDetails[]).map((p) => ({
    ...p,
    passcode: p.passcode ? "***" : null,
    member_count: p.members?.length ?? 0,
  }));
}

// ─── Join a Party ───────────────────────────────────────────────────────────

export async function joinParty(partyId: string, passcode?: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Check party exists and is open
  const { data: party } = await supabase
    .from("parties")
    .select("id, status, max_players, passcode")
    .eq("id", partyId)
    .single();

  if (!party) return { error: "PARTY NOT FOUND." };
  if (party.status !== "open") return { error: "PARTY IS NO LONGER ACCEPTING MEMBERS." };

  // Check passcode for private parties
  if (party.passcode && party.passcode !== (passcode?.trim() ?? "")) {
    return { error: party.passcode && !passcode ? "THIS IS A PRIVATE PARTY. PASSCODE REQUIRED." : "INCORRECT PASSCODE." };
  }

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

  // Notify party members + log event
  const [callsign, title] = await Promise.all([getCallsign(user.id), getPartyTitle(partyId)]);
  await notifyPartyMembers(partyId, user.id, "member_joined", callsign, title);
  await logPartyEvent(partyId, user.id, "join", `${callsign} joined the party`);

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

  // Notify remaining members (creator is already in party_members, so notifyPartyMembers covers them)
  const callsign = await getCallsign(user.id);
  await notifyPartyMembers(partyId, user.id, "member_left", callsign, currentParty?.title ?? "Party");
  await logPartyEvent(partyId, user.id, "leave", `${callsign} left the party`);

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

  const callsign = await getCallsign(user.id);

  // Notify on mission start
  if (status === "in_progress") {
    const title = await getPartyTitle(partyId);
    await notifyPartyMembers(partyId, user.id, "party_started", callsign, title);
  }

  await logPartyEvent(partyId, user.id, "status_change", `${callsign} changed status to ${status}`);

  return {};
}

// ─── Delete / Close a Party ─────────────────────────────────────────────────

export async function closeParty(partyId: string, outcome?: PartyOutcome): Promise<{ error?: string }> {
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
    .update({ status: "closed" as PartyStatus, outcome: outcome ?? "abandoned" })
    .eq("id", partyId)
    .eq("creator_id", user.id);

  if (error) return { error: "FAILED TO CLOSE PARTY." };

  const outcomeLabel = outcome ?? "abandoned";
  await logPartyEvent(partyId, user.id, "closed", `${callsign} closed the party — ${outcomeLabel}`);

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
  await logPartyEvent(partyId, user.id, "kick", `${kickedCallsign} was kicked`);

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

// ─── Toggle Ready Status ───────────────────────────────────────────────────

export async function toggleReady(partyId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  const { data: membership } = await supabase
    .from("party_members")
    .select("id, ready")
    .eq("party_id", partyId)
    .eq("user_id", user.id)
    .single();

  if (!membership) return { error: "NOT A MEMBER OF THIS PARTY." };

  const { error } = await supabase
    .from("party_members")
    .update({ ready: !membership.ready })
    .eq("id", membership.id);

  if (error) return { error: "FAILED TO UPDATE READY STATUS." };
  return {};
}

// ─── Auto-Expire Stale Parties ─────────────────────────────────────────────
// Closes parties that have been open/in_progress for over 24 hours.
// Inserts 0-star penalty ratings for the leader from every remaining member.
// Called on page load to keep the listing clean.

export async function expireStaleParties(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find stale parties before closing them (need member lists for penalty)
  const { data: staleParties } = await supabase
    .from("parties")
    .select("id, creator_id")
    .in("status", ["open", "in_progress"])
    .lt("created_at", cutoff);

  if (!staleParties || staleParties.length === 0) return;

  // Close all stale parties with "abandoned" outcome
  await supabase
    .from("parties")
    .update({ status: "closed" as PartyStatus, outcome: "abandoned" as PartyOutcome })
    .in("id", staleParties.map((p) => p.id));

  // Insert 0-star penalty ratings for each expired party
  for (const party of staleParties) {
    const { data: members } = await supabase
      .from("party_members")
      .select("user_id")
      .eq("party_id", party.id)
      .neq("user_id", party.creator_id);

    if (!members || members.length === 0) continue;

    // Check which members haven't already rated (shouldn't happen, but be safe)
    const { data: existingRatings } = await supabase
      .from("party_ratings")
      .select("rater_id")
      .eq("party_id", party.id);

    const alreadyRated = new Set(existingRatings?.map((r) => r.rater_id) ?? []);

    const penalties = members
      .filter((m) => !alreadyRated.has(m.user_id))
      .map((m) => ({
        party_id: party.id,
        leader_id: party.creator_id,
        rater_id: m.user_id,
        stars: 0,
      }));

    if (penalties.length > 0) {
      await supabase.from("party_ratings").insert(penalties);
    }

    // Log the auto-expire event
    await logPartyEvent(party.id, null, "closed", "Party auto-expired after 24 hours — abandoned");
  }
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

// ─── Rate a Party (after close) ───────────────────────────────────────────

export async function rateParty(
  partyId: string,
  stars: number
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  if (!Number.isInteger(stars) || stars < 0 || stars > 5) {
    return { error: "RATING MUST BE BETWEEN 0 AND 5." };
  }

  // Get party info
  const { data: party } = await supabase
    .from("parties")
    .select("id, creator_id, status")
    .eq("id", partyId)
    .single();

  if (!party) return { error: "PARTY NOT FOUND." };
  if (party.status !== "closed") return { error: "PARTY MUST BE CLOSED TO RATE." };
  if (party.creator_id === user.id) return { error: "CANNOT RATE YOUR OWN PARTY." };

  // Check already rated
  const { data: existing } = await supabase
    .from("party_ratings")
    .select("id")
    .eq("party_id", partyId)
    .eq("rater_id", user.id)
    .single();

  if (existing) return { error: "ALREADY RATED THIS PARTY." };

  const { error } = await supabase.from("party_ratings").insert({
    party_id: partyId,
    leader_id: party.creator_id,
    rater_id: user.id,
    stars,
  });

  if (error) return { error: "FAILED TO SUBMIT RATING." };
  return {};
}

// ─── Check if user has a pending rating for a closed party ────────────────

export async function getPendingRating(
  partyId: string
): Promise<{ canRate: boolean; partyActivity?: PartyActivity; partyTitle?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { canRate: false };

  // Get party info
  const { data: party } = await supabase
    .from("parties")
    .select("id, creator_id, status, activity, title")
    .eq("id", partyId)
    .single();

  if (!party || party.status !== "closed" || party.creator_id === user.id) {
    return { canRate: false };
  }

  // Check if already rated
  const { data: existing } = await supabase
    .from("party_ratings")
    .select("id")
    .eq("party_id", partyId)
    .eq("rater_id", user.id)
    .single();

  if (existing) return { canRate: false };

  return { canRate: true, partyActivity: party.activity, partyTitle: party.title };
}

// ─── Get Leader Reputation (aggregate across all closed parties) ──────────
// Formula: total stars / total individual votes across ALL closed parties.
// Each vote weighs equally, so a party with 5 voters naturally outweighs
// one with 1 voter. Auto-expired parties contribute 0-star penalty votes
// from every member, dragging the score down proportionally.

export async function getLeaderReputation(
  leaderId: string
): Promise<LeaderReputation | null> {
  const supabase = await createClient();

  // Get all closed parties for this leader
  const { data: parties } = await supabase
    .from("parties")
    .select("id, activity")
    .eq("creator_id", leaderId)
    .eq("status", "closed")
    .order("updated_at", { ascending: false });

  if (!parties || parties.length === 0) return null;

  // Get ALL ratings for this leader across all their parties
  const { data: allRatings } = await supabase
    .from("party_ratings")
    .select("stars")
    .eq("leader_id", leaderId);

  if (!allRatings || allRatings.length === 0) return null;

  const totalStars = allRatings.reduce((sum, r) => sum + r.stars, 0);
  const avg = Math.round((totalStars / allRatings.length) * 10) / 10;

  // Count how many parties actually received ratings
  const { data: ratedPartyIds } = await supabase
    .from("party_ratings")
    .select("party_id")
    .eq("leader_id", leaderId);

  const uniquePartiesRated = new Set(ratedPartyIds?.map((r) => r.party_id) ?? []).size;

  return {
    avg_stars: avg,
    total_ratings: allRatings.length,
    parties_led: uniquePartiesRated,
    last_activity: parties[0].activity,
  };
}

// ─── Edit Party (Creator Only) ─────────────────────────────────────────────

export async function editParty(
  partyId: string,
  fields: { title?: string; description?: string; maxPlayers?: number; voiceChat?: string; region?: string; startingStation?: string }
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

  const callsign = await getCallsign(user.id);
  await logPartyEvent(partyId, user.id, "edit", `${callsign} edited the party`);

  return {};
}

// ─── Get Party Event Log ──────────────────────────────────────────────────

export async function getPartyEvents(partyId: string, limit = 50): Promise<PartyEvent[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("party_events")
    .select("*")
    .eq("party_id", partyId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as PartyEvent[];
}

// ─── Invite to Party by Callsign or RSI Handle (Creator Only) ────────────

export async function inviteToParty(
  partyId: string,
  searchTerm: string
): Promise<{ error?: string; invitedUserId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "AUTHENTICATION REQUIRED." };

  // Verify caller is the creator
  const { data: party } = await supabase
    .from("parties")
    .select("creator_id, status, max_players, title")
    .eq("id", partyId)
    .single();

  if (!party) return { error: "PARTY NOT FOUND." };
  if (party.creator_id !== user.id) return { error: "ONLY THE PARTY LEADER CAN INVITE." };
  if (party.status !== "open") return { error: "PARTY IS NOT ACCEPTING NEW MEMBERS." };

  const term = searchTerm.trim();

  // Try callsign first, then RSI handle
  let target: { id: string; callsign: string } | null = null;

  const { data: byCallsign } = await supabase
    .from("profiles")
    .select("id, callsign")
    .ilike("callsign", term)
    .single();

  if (byCallsign) {
    target = byCallsign;
  } else {
    const { data: byHandle } = await supabase
      .from("profiles")
      .select("id, callsign")
      .ilike("sc_handle", term)
      .single();
    target = byHandle;
  }

  if (!target) return { error: `NO PLAYER FOUND WITH CALLSIGN OR RSI HANDLE "${term.toUpperCase()}".` };
  if (target.id === user.id) return { error: "CANNOT INVITE YOURSELF." };

  // Check not already a member
  const { data: existing } = await supabase
    .from("party_members")
    .select("id")
    .eq("party_id", partyId)
    .eq("user_id", target.id)
    .single();

  if (existing) return { error: `${target.callsign.toUpperCase()} IS ALREADY IN THIS PARTY.` };

  // Check capacity
  const { count } = await supabase
    .from("party_members")
    .select("id", { count: "exact", head: true })
    .eq("party_id", partyId);

  if (count !== null && count >= party.max_players) {
    return { error: "PARTY IS FULL." };
  }

  // Add them directly
  const { error } = await supabase.from("party_members").insert({
    party_id: partyId,
    user_id: target.id,
  });

  if (error) return { error: "FAILED TO ADD MEMBER." };

  // Check if now full
  const { count: newCount } = await supabase
    .from("party_members")
    .select("id", { count: "exact", head: true })
    .eq("party_id", partyId);

  if (newCount !== null && newCount >= party.max_players) {
    await supabase.from("parties").update({ status: "full" }).eq("id", partyId);
  }

  // Notify the invited user
  const leaderCallsign = await getCallsign(user.id);
  await supabase.from("party_notifications").insert({
    user_id: target.id,
    party_id: partyId,
    type: "party_invite",
    actor_callsign: leaderCallsign,
    party_title: party.title,
  });

  await logPartyEvent(partyId, user.id, "invite", `${leaderCallsign} invited ${target.callsign}`);

  return { invitedUserId: target.id };
}

// ─── Public Party Listing (no auth required) ──────────────────────────────
// Used on the landing page so unauthenticated visitors can browse open parties.

export async function getPublicParties(filters?: {
  activity?: PartyActivity;
  region?: string;
}): Promise<PublicPartyListing[]> {
  const supabase = await createClient();

  let query = supabase
    .from("parties")
    .select(`
      id, activity, title, description, max_players, region, status,
      starting_station, passcode, created_at,
      creator:creator_id(id, callsign, sc_handle),
      members:party_members(id)
    `)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(30);

  if (filters?.activity) {
    query = query.eq("activity", filters.activity);
  }
  if (filters?.region && filters.region !== "any") {
    query = query.eq("region", filters.region);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Collect unique creator IDs for batch reputation lookup
  const creatorIds = [...new Set(
    (data as unknown as Array<{ creator: { id: string } }>)
      .map((p) => p.creator?.id)
      .filter(Boolean)
  )];

  // Batch fetch reputations
  const repMap = new Map<string, LeaderReputation | null>();
  await Promise.all(
    creatorIds.map(async (id) => {
      const rep = await getLeaderReputation(id);
      repMap.set(id, rep);
    })
  );

  return (data as unknown as Array<Record<string, unknown>>).map((p) => {
    const creator = p.creator as { id: string; callsign: string; sc_handle: string | null } | null;
    const members = p.members as Array<{ id: string }> | null;
    return {
      id: p.id as string,
      activity: p.activity as PartyActivity,
      title: p.title as string,
      description: p.description as string | null,
      creator_callsign: creator?.callsign ?? "UNKNOWN",
      creator_sc_handle: creator?.sc_handle ?? null,
      creator_reputation: creator ? repMap.get(creator.id) ?? null : null,
      member_count: members?.length ?? 0,
      max_players: p.max_players as number,
      region: p.region as string | null,
      starting_station: p.starting_station as string | null,
      is_private: !!(p.passcode),
      status: p.status as PartyStatus,
      created_at: p.created_at as string,
    };
  });
}

/** Get aggregate stats for the landing page hero section */
export async function getPublicPartyStats(): Promise<{ activeParties: number; totalPlayers: number }> {
  const supabase = await createClient();

  const { count: partyCount } = await supabase
    .from("parties")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "in_progress"]);

  const { count: memberCount } = await supabase
    .from("party_members")
    .select("id", { count: "exact", head: true });

  return {
    activeParties: partyCount ?? 0,
    totalPlayers: memberCount ?? 0,
  };
}

