"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCallsign } from "@/app/actions/profile";
import { createClient } from "@/utils/supabase/client";

interface SettingsFormProps {
  currentCallsign: string;
  email: string;
}

export default function SettingsForm({
  currentCallsign,
  email,
}: SettingsFormProps) {
  const router = useRouter();
  const [callsign, setCallsign] = useState(currentCallsign);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!callsign.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateCallsign(callsign);
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      router.refresh();
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-6">
      {/* Callsign Edit */}
      <div className="mtc-panel bg-bg-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-accent" />
          <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
            Callsign
          </h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
              Operative Callsign
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={32}
              value={callsign}
              onChange={(e) => {
                setCallsign(e.target.value);
                setSaved(false);
                setError(null);
              }}
              placeholder="e.g. SHADOW-7"
              className="mtc-input font-mono text-sm uppercase max-w-sm"
              disabled={saving}
            />
            <p className="font-mono text-[9px] text-text-muted tracking-widest">
              Your callsign is visible to all team members and shown on the
              tactical map.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || callsign.trim() === currentCallsign}
              className="mtc-btn-primary"
            >
              {saving ? "SAVING..." : "SAVE CALLSIGN"}
            </button>
            {saved && (
              <span className="font-mono text-[10px] text-accent tracking-widest">
                SAVED
              </span>
            )}
          </div>

          {error && (
            <div className="border border-danger/30 bg-danger/5 px-3 py-2">
              <p className="font-mono text-[10px] text-danger tracking-widest">
                ⚠ {error}
              </p>
            </div>
          )}
        </form>
      </div>

      {/* Account Info */}
      <div className="mtc-panel bg-bg-surface p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-text-muted" />
          <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
            Account
          </h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block font-mono text-[9px] tracking-[0.2em] text-text-muted uppercase mb-0.5">
              Email
            </label>
            <p className="font-mono text-[11px] text-text-dim tracking-widest">
              {email}
            </p>
          </div>

          <div className="pt-3 border-t border-border">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="font-mono text-[10px] tracking-widest text-text-muted hover:text-danger uppercase transition-colors disabled:opacity-40"
            >
              {signingOut ? "SIGNING OUT..." : "SIGN OUT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
