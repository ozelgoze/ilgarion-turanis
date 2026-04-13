import Link from "next/link";
import { getMyTeams, getTeamMembers } from "@/app/actions/teams";
import { getAllMyMaps } from "@/app/actions/maps";
import { getAllMyBriefings } from "@/app/actions/briefings";
import { getMyParties } from "@/app/actions/parties";
import { ROLE_COLORS, ROLE_LABELS, type TeamWithRole, type ThreatLevel } from "@/types/database";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const [teams, maps, briefings, myParties] = await Promise.all([
    getMyTeams(),
    getAllMyMaps(),
    getAllMyBriefings(),
    getMyParties(),
  ]);

  // Compute stats
  const totalOperatives = teams.reduce((sum, t) => sum + t.member_count, 0);
  const commanderCount = teams.filter((t) => t.my_role === "commander").length;
  const recentMapActivity = maps.length > 0
    ? new Date(maps[0].updated_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // Fleet count: gather unique ships from all team rosters
  const allMembers = await Promise.all(
    teams.map((t) => getTeamMembers(t.id))
  );
  const shipSet = new Set<string>();
  for (const roster of allMembers) {
    for (const m of roster) {
      const ship = m.assigned_ship || m.profiles?.primary_ship;
      if (ship) shipSet.add(ship.trim().toUpperCase());
    }
  }
  const fleetCount = shipSet.size;

  // Max threat level across all maps
  const maxThreatNum = maps.reduce(
    (max, m) => Math.max(max, m.threat_level ?? 0),
    0
  );
  const maxThreat = Math.min(maxThreatNum, 3) as ThreatLevel;

  return (
    <DashboardClient
      teams={teams}
      stats={{
        unitCount: teams.length,
        mapCount: maps.length,
        briefingCount: briefings.length,
        operativeCount: totalOperatives,
        commanderCount,
        recentMapActivity,
        fleetCount,
        maxThreat,
        activeParties: myParties.filter((p) => p.status === "open" || p.status === "in_progress").length,
      }}
    />
  );
}
