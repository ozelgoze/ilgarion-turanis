import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { searchParties, getMyParties, expireStaleParties, getMyPartyNotifications } from "@/app/actions/parties";
import PartyHubClient from "./party-hub-client";

export default async function PartiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("callsign, sc_handle")
    .eq("id", user.id)
    .single();

  // Clean up stale parties on page load, then fetch
  await expireStaleParties();

  const [openParties, myParties, notifications] = await Promise.all([
    searchParties(),
    getMyParties(),
    getMyPartyNotifications(),
  ]);

  return (
    <PartyHubClient
      openParties={openParties}
      myParties={myParties}
      currentUserId={user.id}
      currentCallsign={profile?.callsign ?? "OPERATIVE"}
      currentScHandle={profile?.sc_handle ?? null}
      notifications={notifications}
    />
  );
}
