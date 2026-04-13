"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  addTeamMember,
  updateMemberRole,
  removeTeamMember,
  updateMemberShip,
} from "@/app/actions/teams";
import { ROLE_COLORS, ROLE_LABELS } from "@/types/database";
import type { TeamRole, TeamMemberWithProfile } from "@/types/database";

interface TeamRosterProps {
  teamId: string;
  members: TeamMemberWithProfile[];
  isCommander: boolean;
  currentUserId: string;
}

const ALL_ROLES: TeamRole[] = ["commander", "planner", "operator"];

export default function TeamRoster({
  teamId,
  members,
  isCommander,
  currentUserId,
}: TeamRosterProps) {
  const router = useRouter();
  const [callsign, setCallsign] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("operator");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingShip, setEditingShip] = useState<string | null>(null);
  const [shipValue, setShipValue] = useState("");
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // ── Real-time: broadcast roster changes to other viewers ──
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`team-roster:${teamId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "roster_change" }, () => {
        router.refresh();
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [teamId, router]);

  function broadcastRosterChange() {
    channelRef.current?.send({
      type: "broadcast",
      event: "roster_change",
      payload: { sender: currentUserId },
    });
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!callsign.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const result = await addTeamMember(teamId, callsign.trim(), inviteRole);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(`${callsign.toUpperCase()} ADDED AS ${ROLE_LABELS[inviteRole]}`);
      setCallsign("");
      broadcastRosterChange();
      router.refresh();
    }
  }

  async function handleRoleChange(memberId: string, newRole: TeamRole) {
    const result = await updateMemberRole(memberId, newRole);
    if (result.error) {
      setError(result.error);
    } else {
      broadcastRosterChange();
      router.refresh();
    }
  }

  async function handleShipSave(memberId: string) {
    const result = await updateMemberShip(memberId, shipValue);
    if (result.error) {
      setError(result.error);
    } else {
      setEditingShip(null);
      broadcastRosterChange();
      router.refresh();
    }
  }

  async function handleRemove(memberId: string, memberCallsign: string) {
    if (
      !confirm(
        `Remove ${memberCallsign.toUpperCase()} from this unit? This action cannot be undone.`
      )
    )
      return;
    const result = await removeTeamMember(memberId);
    if (result.error) {
      setError(result.error);
    } else {
      broadcastRosterChange();
      router.refresh();
    }
  }

  return (
    <div>
      {/* Member List */}
      <div className="mtc-panel bg-bg-surface overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2 font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Callsign
              </th>
              <th className="text-left px-4 py-2 font-mono text-[9px] tracking-widest text-text-muted uppercase hidden sm:table-cell">
                SC Handle
              </th>
              <th className="text-left px-4 py-2 font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Role
              </th>
              <th className="text-left px-4 py-2 font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Ship Assignment
              </th>
              <th className="text-left px-4 py-2 font-mono text-[9px] tracking-widest text-text-muted uppercase hidden md:table-cell">
                Org
              </th>
              <th className="text-left px-4 py-2 font-mono text-[9px] tracking-widest text-text-muted uppercase hidden lg:table-cell">
                Joined
              </th>
              {isCommander && (
                <th className="text-right px-4 py-2 font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.user_id === currentUserId;
              const roleColor = ROLE_COLORS[m.role];
              const joinedDate = new Date(m.joined_at).toLocaleDateString(
                "en-GB",
                { day: "2-digit", month: "short", year: "numeric" }
              );

              return (
                <tr
                  key={m.id}
                  className="border-b border-border/50 last:border-b-0 hover:bg-bg-elevated/50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      <span className="font-mono text-[11px] tracking-widest text-text-bright uppercase">
                        {m.profiles?.callsign ?? "UNKNOWN"}
                      </span>
                      {isSelf && (
                        <span className="font-mono text-[8px] text-text-muted tracking-widest">
                          (YOU)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    {m.profiles?.sc_handle ? (
                      <a
                        href={`https://robertsspaceindustries.com/citizens/${encodeURIComponent(m.profiles.sc_handle)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[10px] tracking-widest text-accent/70 hover:text-accent transition-colors uppercase"
                        title={`View ${m.profiles.sc_handle} on RSI`}
                      >
                        {m.profiles.sc_handle}
                        <span className="ml-1 text-[8px] text-text-muted">↗</span>
                      </a>
                    ) : (
                      <span className="font-mono text-[10px] text-text-muted/30 tracking-widest">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {isCommander && !isSelf ? (
                      <select
                        value={m.role}
                        onChange={(e) =>
                          handleRoleChange(m.id, e.target.value as TeamRole)
                        }
                        className="font-mono text-[10px] tracking-widest uppercase bg-transparent border border-border px-1.5 py-0.5 outline-none cursor-pointer"
                        style={{ color: roleColor }}
                      >
                        {ALL_ROLES.map((r) => (
                          <option
                            key={r}
                            value={r}
                            className="bg-bg-surface text-text-dim"
                          >
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="font-mono text-[10px] tracking-widest uppercase px-1.5 py-0.5 border"
                        style={{
                          color: roleColor,
                          borderColor: `${roleColor}40`,
                        }}
                      >
                        {ROLE_LABELS[m.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editingShip === m.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={shipValue}
                          onChange={(e) => setShipValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleShipSave(m.id);
                            if (e.key === "Escape") setEditingShip(null);
                          }}
                          placeholder="e.g. Retaliator"
                          className="bg-bg-surface border border-border px-1.5 py-0.5 font-mono text-[10px] text-text-bright w-28 focus:border-accent/50 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleShipSave(m.id)}
                          className="font-mono text-[8px] text-accent tracking-widest hover:text-accent/80"
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (isCommander || isSelf) {
                            setEditingShip(m.id);
                            setShipValue(m.assigned_ship ?? m.profiles?.primary_ship ?? "");
                          }
                        }}
                        className={[
                          "font-mono text-[10px] tracking-widest",
                          m.assigned_ship
                            ? "text-amber"
                            : m.profiles?.primary_ship
                              ? "text-text-muted/60 italic"
                              : "text-text-muted/30",
                          (isCommander || isSelf) ? "hover:text-accent cursor-pointer" : "cursor-default",
                        ].join(" ")}
                        title={
                          m.assigned_ship
                            ? `Assigned: ${m.assigned_ship}`
                            : m.profiles?.primary_ship
                              ? `Default ship: ${m.profiles.primary_ship} (click to assign)`
                              : isCommander || isSelf
                                ? "Click to assign ship"
                                : "No ship assigned"
                        }
                      >
                        {m.assigned_ship
                          ? m.assigned_ship.toUpperCase()
                          : m.profiles?.primary_ship
                            ? m.profiles.primary_ship.toUpperCase()
                            : "—"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    {m.profiles?.sc_org ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-accent/20 bg-accent/5">
                        <span className="w-1 h-1 bg-accent/50" />
                        <span className="font-mono text-[9px] tracking-widest text-accent/70 uppercase">
                          {m.profiles.sc_org}
                        </span>
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-text-muted/30 tracking-widest">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    <span className="font-mono text-[10px] text-text-muted tracking-widest">
                      {joinedDate}
                    </span>
                  </td>
                  {isCommander && (
                    <td className="px-4 py-2.5 text-right">
                      {!isSelf && (
                        <button
                          onClick={() =>
                            handleRemove(
                              m.id,
                              m.profiles?.callsign ?? "UNKNOWN"
                            )
                          }
                          className="font-mono text-[9px] text-text-muted hover:text-danger tracking-widest uppercase transition-colors"
                        >
                          REMOVE
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Member Form (commander only) */}
      {isCommander && (
        <form
          onSubmit={handleInvite}
          className="mt-4 mtc-panel bg-bg-surface p-4"
        >
          <p className="font-mono text-[9px] tracking-widest text-text-muted uppercase mb-3">
            Add Operative by Callsign
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <label className="block font-mono text-[9px] tracking-[0.2em] text-text-dim uppercase">
                Callsign
              </label>
              <input
                type="text"
                required
                value={callsign}
                onChange={(e) => {
                  setCallsign(e.target.value);
                  setError(null);
                  setSuccess(null);
                }}
                placeholder="e.g. SHADOW-7"
                className="mtc-input font-mono text-sm uppercase"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <label className="block font-mono text-[9px] tracking-[0.2em] text-text-dim uppercase">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                disabled={submitting}
                className="mtc-input font-mono text-[10px] uppercase h-[38px]"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting || !callsign.trim()}
              className="mtc-btn-primary whitespace-nowrap"
            >
              {submitting ? "ADDING..." : "+ ADD"}
            </button>
          </div>

          {error && (
            <div className="mt-3 border border-danger/30 bg-danger/5 px-3 py-2">
              <p className="font-mono text-[10px] text-danger tracking-widest">
                ⚠ {error}
              </p>
            </div>
          )}
          {success && (
            <div className="mt-3 border border-accent/30 bg-accent/5 px-3 py-2">
              <p className="font-mono text-[10px] text-accent tracking-widest">
                ✓ {success}
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
