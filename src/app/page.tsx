import { createClient } from "@/utils/supabase/server";
import { getPublicParties, getPublicPartyStats, expireStaleParties } from "@/app/actions/parties";
import LandingClient from "./landing-client";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Clean up stale parties, then fetch public data
  await expireStaleParties();

  const [parties, stats] = await Promise.all([
    getPublicParties(),
    getPublicPartyStats(),
  ]);

  return (
    <LandingClient
      initialParties={parties}
      isAuthenticated={!!user}
      stats={stats}
    />
  );
}
