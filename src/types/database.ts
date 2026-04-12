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
