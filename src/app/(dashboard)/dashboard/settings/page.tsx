import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getProfile } from "@/app/actions/profile";
import SettingsForm from "./settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6">
        <span className="font-mono text-[10px] tracking-widest text-text-muted uppercase">
          Settings
        </span>
      </nav>

      {/* Header */}
      <div className="mtc-panel bg-bg-surface p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 bg-accent shrink-0" />
          <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
            Operative Profile
          </span>
        </div>
        <h1 className="font-mono font-bold text-text-bright text-xl tracking-wide mb-2">
          {profile?.callsign ?? "OPERATIVE"}
        </h1>
        <p className="font-mono text-[10px] text-text-muted tracking-widest">
          {user.email}
        </p>
      </div>

      <SettingsForm
        currentCallsign={profile?.callsign ?? ""}
        email={user.email ?? ""}
        scHandle={profile?.sc_handle ?? ""}
        primaryShip={profile?.primary_ship ?? ""}
        scOrg={profile?.sc_org ?? ""}
      />
    </div>
  );
}
