import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getParty, getPartyMessages } from "@/app/actions/parties";
import PartyDetailClient from "./party-detail-client";

interface Props {
  params: Promise<{ partyId: string }>;
}

export default async function PartyDetailPage({ params }: Props) {
  const { partyId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const party = await getParty(partyId);
  if (!party) redirect("/dashboard/parties");

  const isMember = party.members?.some((m) => m.user_id === user.id);

  const [profile, messages] = await Promise.all([
    supabase
      .from("profiles")
      .select("callsign, sc_handle")
      .eq("id", user.id)
      .single()
      .then((r) => r.data),
    isMember ? getPartyMessages(partyId) : Promise.resolve([]),
  ]);

  return (
    <PartyDetailClient
      party={party}
      currentUserId={user.id}
      currentCallsign={profile?.callsign ?? "OPERATIVE"}
      currentScHandle={profile?.sc_handle ?? null}
      initialMessages={messages}
    />
  );
}
