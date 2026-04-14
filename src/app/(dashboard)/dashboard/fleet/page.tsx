import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getMyHangar } from "@/app/actions/hangar";
import FleetHubClient from "./fleet-hub-client";

export default async function FleetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const hangar = await getMyHangar();

  return <FleetHubClient hangar={hangar} />;
}
