import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch the current user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("callsign, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar callsign={profile?.callsign ?? "OPERATIVE"} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
