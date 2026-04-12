import Link from "next/link";
import { getMyTeams } from "@/app/actions/teams";
import { getAllMyMaps } from "@/app/actions/maps";
import { getAllMyBriefings } from "@/app/actions/briefings";
import { ROLE_COLORS, ROLE_LABELS, type TeamWithRole } from "@/types/database";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const [teams, maps, briefings] = await Promise.all([
    getMyTeams(),
    getAllMyMaps(),
    getAllMyBriefings(),
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
      }}
    />
  );
}
