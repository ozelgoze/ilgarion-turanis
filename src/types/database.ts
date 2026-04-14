// ============================================================
// UEE ATAK APP — TypeScript Interfaces
// Mirrors the Supabase PostgreSQL schema exactly
// ============================================================

export type TeamRole = "commander" | "planner" | "operator";
export type MarkerAffiliation = "friendly" | "hostile" | "neutral" | "unknown";
export type MarkerType =
  | "infantry"
  | "armor"
  | "air"
  | "naval"
  | "artillery"
  | "logistics"
  | "hq"
  | "recon"
  | "medical"
  | "custom";
export type DrawingType =
  | "line"
  | "arrow"
  | "polyline"
  | "polygon"
  | "circle"
  | "rectangle"
  | "freehand";

export interface Profile {
  id: string;
  callsign: string;
  avatar_url: string | null;
  sc_handle: string | null;
  primary_ship: string | null;
  sc_org: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  assigned_ship: string | null;
  joined_at: string;
}

export type ThreatLevel = 0 | 1 | 2 | 3;

export const THREAT_LEVELS: Record<ThreatLevel, { label: string; color: string; description: string }> = {
  0: { label: "GREEN", color: "#00ffcc", description: "No threat — routine operations" },
  1: { label: "YELLOW", color: "#F0A500", description: "Elevated — possible hostile activity" },
  2: { label: "ORANGE", color: "#FF8C00", description: "High — confirmed hostile presence" },
  3: { label: "RED", color: "#FF2442", description: "Critical — active engagement / under attack" },
};

export interface TacticalMap {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  image_path: string;
  grid_type: "none" | "hex" | "square";
  grid_size: number;
  scale_factor: number;
  canvas_state: Record<string, unknown> | null;
  threat_level: ThreatLevel;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TacticalMarker {
  id: string;
  map_id: string;
  marker_type: MarkerType;
  affiliation: MarkerAffiliation;
  label: string | null;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  metadata: Record<string, unknown>;
  placed_by: string;
  assigned_to: string | null;
  label_size: number;
  created_at: string;
  updated_at: string;
}

export interface MapDrawing {
  id: string;
  map_id: string;
  drawing_type: DrawingType;
  points: Array<{ x: number; y: number }>;
  stroke_color: string;
  stroke_width: number;
  fill_color: string | null;
  label: string | null;
  metadata: Record<string, unknown>;
  drawn_by: string;
  created_at: string;
  updated_at: string;
}

export interface Briefing {
  id: string;
  team_id: string;
  map_id: string | null;
  title: string;
  content: string | null;
  embed_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Extended / Joined Types ─────────────────────────────

export interface TeamWithRole extends Team {
  my_role: TeamRole;
  member_count: number;
}

export interface TeamMemberWithProfile extends TeamMember {
  profiles: Profile;
}

export interface TacticalMapWithCreator extends TacticalMap {
  profiles: Pick<Profile, "callsign">;
}

// ─── Role Helpers ────────────────────────────────────────

export const ROLE_LABELS: Record<TeamRole, string> = {
  commander: "COMMANDER",
  planner: "PLANNER",
  operator: "OPERATOR",
};

export const ROLE_COLORS: Record<TeamRole, string> = {
  commander: "#F0A500",
  planner: "#00ffcc",
  operator: "#45A29E",
};

export function canEdit(role: TeamRole): boolean {
  return role === "commander" || role === "planner";
}

export function isCommander(role: TeamRole): boolean {
  return role === "commander";
}

// ─── Party / LFG System ────────────────────────────────────

export type PartyActivity =
  | "bounty_hunting"
  | "cargo_run"
  | "mining"
  | "salvage"
  | "fps_mission"
  | "fleet_battle"
  | "racing"
  | "exploration"
  | "blueprint_run"
  | "escort"
  | "medical_rescue"
  | "piracy"
  | "other";

export type PartyStatus = "open" | "full" | "closed" | "in_progress";

export const PARTY_ACTIVITIES: Record<PartyActivity, { label: string; icon: string; color: string; description: string }> = {
  bounty_hunting: { label: "Bounty Hunting", icon: "crosshair", color: "#FF2442", description: "Track and eliminate targets for aUEC" },
  cargo_run: { label: "Cargo Run", icon: "package", color: "#F0A500", description: "Trade goods between locations" },
  mining: { label: "Mining", icon: "pickaxe", color: "#C4724B", description: "Extract minerals and gems" },
  salvage: { label: "Salvage", icon: "wrench", color: "#D2691E", description: "Recover materials from wrecks" },
  fps_mission: { label: "FPS Mission", icon: "target", color: "#FF6B35", description: "Ground combat bunker missions" },
  fleet_battle: { label: "Fleet Battle", icon: "zap", color: "#FF2442", description: "Large-scale PvP fleet engagement" },
  racing: { label: "Racing", icon: "gauge", color: "#9B7FE8", description: "Ship or ground vehicle racing" },
  exploration: { label: "Exploration", icon: "compass", color: "#70B8E0", description: "Scout unknown areas and find POIs" },
  blueprint_run: { label: "Blueprint Run", icon: "file", color: "#00ffcc", description: "Collect blueprints from bunkers" },
  escort: { label: "Escort / Security", icon: "shield", color: "#5B9BD5", description: "Protect cargo haulers or players" },
  medical_rescue: { label: "Medical Rescue", icon: "heart", color: "#FF8C00", description: "Search and rescue operations" },
  piracy: { label: "Piracy", icon: "skull", color: "#FF2442", description: "Raid and plunder (outlaw gameplay)" },
  other: { label: "Other", icon: "star", color: "#666", description: "Custom activity" },
};

export const PARTY_STATUS_LABELS: Record<PartyStatus, { label: string; color: string }> = {
  open: { label: "OPEN", color: "#00ffcc" },
  full: { label: "FULL", color: "#F0A500" },
  closed: { label: "CLOSED", color: "#666" },
  in_progress: { label: "IN PROGRESS", color: "#FF8C00" },
};

export interface Party {
  id: string;
  creator_id: string;
  activity: PartyActivity;
  title: string;
  description: string | null;
  min_players: number;
  max_players: number;
  status: PartyStatus;
  region: string | null;
  voice_chat: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartyMember {
  id: string;
  party_id: string;
  user_id: string;
  ready: boolean;
  joined_at: string;
}

export interface PartyWithDetails extends Party {
  creator: Pick<Profile, "id" | "callsign" | "sc_handle" | "primary_ship">;
  members: Array<{
    id: string;
    user_id: string;
    ready: boolean;
    joined_at: string;
    profiles: Pick<Profile, "id" | "callsign" | "sc_handle" | "primary_ship">;
  }>;
  member_count: number;
}

export interface PartyMessage {
  id: string;
  party_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface PartyMessageWithProfile extends PartyMessage {
  profiles: Pick<Profile, "id" | "callsign">;
}

export type PartyNotificationType =
  | "member_joined"
  | "member_left"
  | "member_kicked"
  | "party_started"
  | "party_closed";

export const PARTY_NOTIFICATION_LABELS: Record<PartyNotificationType, { verb: string; color: string }> = {
  member_joined: { verb: "joined", color: "#00ffcc" },
  member_left: { verb: "left", color: "#F0A500" },
  member_kicked: { verb: "was kicked from", color: "#FF2442" },
  party_started: { verb: "started mission in", color: "#FF8C00" },
  party_closed: { verb: "closed", color: "#666" },
};

export interface PartyNotification {
  id: string;
  user_id: string;
  party_id: string;
  type: PartyNotificationType;
  actor_callsign: string;
  party_title: string;
  read: boolean;
  created_at: string;
}

// ─── Party Rating System ──────────────────────────────────────

export interface PartyRating {
  id: string;
  party_id: string;
  leader_id: string;
  rater_id: string;
  stars: number;
  created_at: string;
}

/** Aggregated reputation for a party leader across all their closed parties.
 *  Overall score = total stars / total votes (each individual vote weighs equally,
 *  so parties with more voters naturally carry more weight). */
export interface LeaderReputation {
  avg_stars: number;
  total_ratings: number;
  parties_led: number;
  last_activity: PartyActivity;
}
