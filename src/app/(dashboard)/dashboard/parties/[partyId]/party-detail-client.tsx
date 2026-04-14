"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import PageTransition from "@/components/page-transition";
import {
  PARTY_ACTIVITIES,
  PARTY_STATUS_LABELS,
  type PartyWithDetails,
  type PartyMessageWithProfile,
  type LeaderReputation,
} from "@/types/database";
import {
  joinParty,
  leaveParty,
  closeParty,
  updatePartyStatus,
  kickMember,
  sendPartyMessage,
  getPartyMessages,
  getParty,
  editParty,
  toggleReady,
  rateParty,
  getPendingRating,
  getLeaderReputation,
} from "@/app/actions/parties";
import { usePartyRealtime } from "@/hooks/use-party-realtime";

interface Props {
  party: PartyWithDetails;
  currentUserId: string;
  currentCallsign: string;
  currentScHandle: string | null;
  initialMessages: PartyMessageWithProfile[];
}

export default function PartyDetailClient({
  party: initialParty,
  currentUserId,
  currentCallsign,
  currentScHandle,
  initialMessages,
}: Props) {
  const router = useRouter();
  const [party, setParty] = useState(initialParty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ label: string; action: () => void } | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMax, setEditMax] = useState(4);
  const [editVoice, setEditVoice] = useState("");
  const [readyLoading, setReadyLoading] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [leaderRep, setLeaderRep] = useState<LeaderReputation | null>(null);
  const [countdown, setCountdown] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activity = PARTY_ACTIVITIES[party.activity];
  const status = PARTY_STATUS_LABELS[party.status];
  const isCreator = party.creator_id === currentUserId;
  const isMember = party.members?.some((m) => m.user_id === currentUserId);
  const spotsLeft = party.max_players - (party.member_count ?? 0);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Load leader reputation
  useEffect(() => {
    getLeaderReputation(party.creator_id).then(setLeaderRep);
  }, [party.creator_id]);

  // Check for pending rating when party becomes closed
  useEffect(() => {
    if (party.status === "closed" && !isCreator && !ratingDone) {
      getPendingRating(party.id).then((result) => {
        if (result.canRate) setShowRating(true);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party.status, party.id]);

  // Countdown timer for auto-close (24h from updated_at)
  useEffect(() => {
    if (party.status === "closed") { setCountdown(""); return; }

    function tick() {
      const deadline = new Date(party.updated_at).getTime() + 24 * 60 * 60 * 1000;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setCountdown("EXPIRED");
        return;
      }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [party.status, party.updated_at]);

  // Real-time: refresh party data when changes happen
  const refreshParty = useCallback(async () => {
    const updated = await getParty(party.id);
    if (updated) setParty(updated);
  }, [party.id]);

  const refreshMessages = useCallback(async () => {
    const msgs = await getPartyMessages(party.id);
    setMessages(msgs);
  }, [party.id]);

  // Also notify the party hub list and notification channel
  const hubChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  const notifChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel("party-hub", { config: { broadcast: { self: false } } }).subscribe();
    const notifCh = supabase.channel("party-notifications", { config: { broadcast: { self: false } } }).subscribe();
    hubChannelRef.current = ch;
    notifChannelRef.current = notifCh;
    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(notifCh);
      hubChannelRef.current = null;
      notifChannelRef.current = null;
    };
  }, []);

  function broadcastHubChange() {
    hubChannelRef.current?.send({
      type: "broadcast",
      event: "party_list_change",
      payload: { sender: currentUserId },
    });
  }

  function broadcastNotification(targetUserIds: string[]) {
    notifChannelRef.current?.send({
      type: "broadcast",
      event: "new_notification",
      payload: { targetUserIds },
    });
  }

  /** Get all member user IDs except the current user (for notification targeting) */
  function getOtherMemberIds(): string[] {
    return (party.members ?? [])
      .map((m) => m.user_id)
      .filter((id) => id !== currentUserId);
  }

  const { broadcast } = usePartyRealtime({
    partyId: party.id,
    currentUserId,
    onPartyChange: refreshParty,
    onMembersChange: () => {
      refreshParty();
      refreshMessages();
    },
    onNewMessage: () => {
      refreshMessages();
    },
  });

  async function handleAction(
    action: () => Promise<{ error?: string }>,
    redirectTo?: string,
    broadcastType?: "party_update" | "members_change",
    notifyTargets?: string[],
  ) {
    setLoading(true);
    setError(null);
    const result = await action();
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      if (broadcastType) {
        broadcast({ type: broadcastType, sender: currentUserId });
        broadcastHubChange();
      }
      if (notifyTargets && notifyTargets.length > 0) {
        broadcastNotification(notifyTargets);
      }
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        await refreshParty();
      }
    }
  }

  async function handleKick(targetUserId: string) {
    setKickingId(targetUserId);
    const result = await kickMember(party.id, targetUserId);
    setKickingId(null);
    if (result.error) {
      setError(result.error);
    } else {
      broadcast({ type: "members_change", sender: currentUserId });
      broadcastHubChange();
      broadcastNotification([targetUserId]);
      await refreshParty();
    }
  }

  async function handleToggleReady() {
    setReadyLoading(true);
    await toggleReady(party.id);
    await refreshParty();
    setReadyLoading(false);
    broadcast({ type: "members_change", sender: currentUserId });
  }

  async function handleRatingSubmit() {
    setRatingSubmitting(true);
    const result = await rateParty(party.id, ratingValue);
    setRatingSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setRatingDone(true);
      setShowRating(false);
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/dashboard/parties/${party.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openEdit() {
    setEditTitle(party.title);
    setEditDesc(party.description ?? "");
    setEditMax(party.max_players);
    setEditVoice(party.voice_chat ?? "");
    setEditing(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await editParty(party.id, {
      title: editTitle,
      description: editDesc,
      maxPlayers: editMax,
      voiceChat: editVoice,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEditing(false);
      broadcast({ type: "party_update", sender: currentUserId });
      await refreshParty();
    }
  }

  function confirmThen(label: string, action: () => void) {
    setConfirmAction({ label, action });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!msgInput.trim() || sending) return;
    setSending(true);
    const result = await sendPartyMessage(party.id, msgInput);
    setSending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setMsgInput("");
      await refreshMessages();
      // Broadcast to other clients so they refresh immediately
      broadcast({ type: "party_message", sender: currentUserId });
    }
  }

  return (
    <PageTransition className="p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="font-mono text-[10px] tracking-widest text-text-muted hover:text-text-dim uppercase transition-colors">
          OPS CENTER
        </Link>
        <span className="font-mono text-[10px] text-border">&rsaquo;</span>
        <Link href="/dashboard/parties" className="font-mono text-[10px] tracking-widest text-text-muted hover:text-text-dim uppercase transition-colors">
          Party Finder
        </Link>
        <span className="font-mono text-[10px] text-border">&rsaquo;</span>
        <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
          Detail
        </span>
      </nav>

      {/* Party Header */}
      <div className="mtc-panel bg-bg-surface p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3" style={{ backgroundColor: activity.color }} />
            <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: activity.color }}>
              {activity.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-accent animate-pulse" />
              <span className="font-mono text-[8px] tracking-widest text-accent/60 uppercase">LIVE</span>
            </div>
            <span
              className="font-mono text-[9px] tracking-widest uppercase px-2 py-1 border"
              style={{ color: status.color, borderColor: `${status.color}40` }}
            >
              {status.label}
            </span>
          </div>
        </div>

        <h1 className="font-mono font-bold text-text-bright text-lg tracking-wide mb-2">
          {party.title}
        </h1>

        {party.description && (
          <p className="font-mono text-[11px] text-text-dim tracking-wide leading-relaxed mb-4">
            {party.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase">Players:</span>
            <span className="font-mono text-[11px] text-accent tracking-wider">
              {party.member_count}/{party.max_players}
            </span>
            {spotsLeft > 0 && party.status === "open" && (
              <span className="font-mono text-[8px] text-accent/50 tracking-widest">
                ({spotsLeft} open)
              </span>
            )}
          </div>
          {party.region && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase">Region:</span>
              <span className="font-mono text-[11px] text-text-dim tracking-wider uppercase">
                {party.region}
              </span>
            </div>
          )}
          {party.voice_chat && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase">Voice:</span>
              <span className="font-mono text-[11px] text-accent/80 tracking-wider break-all">
                {party.voice_chat}
              </span>
            </div>
          )}
          <span className="font-mono text-[8px] text-text-muted/50 tracking-widest ml-auto">
            Created {getTimeAgo(party.created_at)}
          </span>
        </div>

        {/* Leader reputation */}
        {leaderRep && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase">Leader Rating:</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s <= Math.round(leaderRep.avg_stars) ? "#F0A500" : "none"} stroke={s <= Math.round(leaderRep.avg_stars) ? "#F0A500" : "#45A29E40"} strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <span className="font-mono text-[9px] text-amber tracking-widest">
              {leaderRep.avg_stars}
            </span>
            <span className="font-mono text-[8px] text-text-muted/50 tracking-widest">
              ({leaderRep.total_ratings} vote{leaderRep.total_ratings !== 1 ? "s" : ""} across {leaderRep.parties_led} {leaderRep.parties_led !== 1 ? "parties" : "party"})
            </span>
            <span className="font-mono text-[8px] tracking-widest uppercase" style={{ color: PARTY_ACTIVITIES[leaderRep.last_activity].color }}>
              Last: {PARTY_ACTIVITIES[leaderRep.last_activity].label}
            </span>
          </div>
        )}
      </div>

      {/* Auto-close countdown warning */}
      {party.status !== "closed" && countdown && (
        <div className={[
          "mb-4 border px-4 py-3 flex items-start gap-3",
          countdown === "EXPIRED"
            ? "border-danger/40 bg-danger/5"
            : "border-amber/30 bg-amber/5",
        ].join(" ")}>
          <div className="shrink-0 mt-0.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={countdown === "EXPIRED" ? "#FF2442" : "#F0A500"} strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className={[
                "font-mono text-[11px] tracking-widest font-bold",
                countdown === "EXPIRED" ? "text-danger" : "text-amber",
              ].join(" ")}>
                {countdown === "EXPIRED" ? "AUTO-CLOSED" : countdown}
              </span>
              <span className="font-mono text-[9px] text-text-muted tracking-widest uppercase">
                until auto-close
              </span>
            </div>
            {isCreator ? (
              <p className="font-mono text-[9px] text-text-muted tracking-widest leading-relaxed">
                Close this party manually when your activity is finished.
                Parties not closed within 24h are auto-closed with a <span className="text-danger font-bold">0-star penalty</span> from every remaining member.
              </p>
            ) : (
              <p className="font-mono text-[9px] text-text-muted tracking-widest leading-relaxed">
                This party will auto-close in the time shown above.
                If auto-closed, a <span className="text-danger font-bold">0-star rating</span> is applied to the leader.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 border border-danger/30 bg-danger/5 px-4 py-2">
          <p className="font-mono text-[10px] text-danger tracking-widest">{error}</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mtc-panel bg-bg-surface p-6 max-w-sm w-full mx-4">
            <p className="font-mono text-[11px] text-text-bright tracking-wide mb-4">
              Are you sure you want to <span className="text-danger">{confirmAction.label}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="mtc-btn-ghost text-[10px]"
              >
                CANCEL
              </button>
              <button
                onClick={() => { confirmAction.action(); setConfirmAction(null); }}
                className="mtc-btn-ghost text-danger border-danger/30 hover:bg-danger/10 text-[10px]"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Party Dialog */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mtc-panel bg-bg-surface p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-accent" />
              <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
                Edit Party
              </h2>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">Title</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mtc-input font-mono text-sm w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="mtc-input font-mono text-[11px] w-full resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">Max Players</label>
                  <select
                    value={editMax}
                    onChange={(e) => setEditMax(Number(e.target.value))}
                    className="mtc-input font-mono text-sm w-full"
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 16, 32].map((n) => (
                      <option key={n} value={n}>{n} players</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[9px] tracking-widest text-text-muted uppercase">Voice Chat</label>
                  <input
                    type="text"
                    value={editVoice}
                    onChange={(e) => setEditVoice(e.target.value)}
                    className="mtc-input font-mono text-[11px] w-full"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditing(false)} className="mtc-btn-ghost text-[10px]">
                  CANCEL
                </button>
                <button type="submit" disabled={loading} className="mtc-btn-primary text-[10px]">
                  {loading ? "SAVING..." : "SAVE CHANGES"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mtc-panel bg-bg-surface p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-amber" />
              <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
                Rate This Party
              </h2>
            </div>
            <p className="font-mono text-[10px] text-text-muted tracking-widest mb-1">
              How was <span className="text-text-bright">{party.creator?.callsign ?? "the leader"}</span>&apos;s party?
            </p>
            <p className="font-mono text-[9px] text-text-muted/60 tracking-widest mb-5">
              Your rating will be shown on their next party listing.
            </p>

            {/* Star picker */}
            <div className="flex items-center justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  onClick={() => setRatingValue(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill={(ratingHover || ratingValue) >= star ? "#F0A500" : "none"}
                    stroke={(ratingHover || ratingValue) >= star ? "#F0A500" : "#45A29E40"}
                    strokeWidth="1.5"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>

            <div className="text-center mb-5">
              <span className="font-mono text-[11px] tracking-widest text-amber">
                {ratingValue === 0 ? "SELECT A RATING" : `${ratingValue} STAR${ratingValue !== 1 ? "S" : ""}`}
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowRating(false); setRatingDone(true); }}
                className="mtc-btn-ghost text-[10px]"
              >
                SKIP
              </button>
              <button
                onClick={handleRatingSubmit}
                disabled={ratingValue === 0 || ratingSubmitting}
                className="mtc-btn-primary text-[10px] px-5"
              >
                {ratingSubmitting ? "SUBMITTING..." : "SUBMIT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating submitted confirmation */}
      {ratingDone && !showRating && ratingValue > 0 && (
        <div className="mb-4 border border-amber/30 bg-amber/5 px-4 py-2 flex items-center gap-2">
          <span className="font-mono text-[10px] text-amber tracking-widest">
            RATING SUBMITTED — {ratingValue} STAR{ratingValue !== 1 ? "S" : ""}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s <= ratingValue ? "#F0A500" : "none"} stroke={s <= ratingValue ? "#F0A500" : "#666"} strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {!isMember && !isCreator && party.status === "open" && (
          <button
            onClick={() => handleAction(() => joinParty(party.id), undefined, "members_change", [party.creator_id])}
            disabled={loading}
            className="mtc-btn-primary"
          >
            {loading ? "JOINING..." : "JOIN PARTY"}
          </button>
        )}
        {isMember && !isCreator && (
          <button
            onClick={() => confirmThen("leave this party", () => handleAction(() => leaveParty(party.id), "/dashboard/parties", "members_change", getOtherMemberIds()))}
            disabled={loading}
            className="mtc-btn-ghost text-danger border-danger/30 hover:bg-danger/10"
          >
            LEAVE PARTY
          </button>
        )}
        {isCreator && (
          <>
            {party.status === "open" && (
              <button
                onClick={() => handleAction(() => updatePartyStatus(party.id, "in_progress"), undefined, "party_update", getOtherMemberIds())}
                disabled={loading}
                className="mtc-btn-primary"
              >
                START MISSION
              </button>
            )}
            {party.status === "in_progress" && (
              <button
                onClick={() => handleAction(() => updatePartyStatus(party.id, "open"), undefined, "party_update")}
                disabled={loading}
                className="mtc-btn-ghost"
              >
                REOPEN
              </button>
            )}
            {party.status !== "closed" && (
              <>
                <button onClick={openEdit} className="mtc-btn-ghost text-[10px]">
                  EDIT
                </button>
                <button
                  onClick={() => confirmThen("close this party", () => handleAction(() => closeParty(party.id), "/dashboard/parties", "party_update", getOtherMemberIds()))}
                  disabled={loading}
                  className="mtc-btn-ghost text-danger border-danger/30 hover:bg-danger/10"
                >
                  CLOSE PARTY
                </button>
              </>
            )}
          </>
        )}

        {/* Copy invite link */}
        <button onClick={handleCopyLink} className="mtc-btn-ghost text-[10px]">
          {copied ? "COPIED!" : "COPY LINK"}
        </button>

        <Link href="/dashboard/parties" className="mtc-btn-ghost ml-auto">
          BACK TO PARTIES
        </Link>
      </div>

      {/* Two-column layout: Members + Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Members List */}
        <div className="mtc-panel bg-bg-surface p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-accent" />
            <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
              Party Members
            </h2>
            {/* Ready count */}
            {party.members && party.members.length > 0 && party.status !== "closed" && (
              <span className="font-mono text-[8px] tracking-widest text-accent/60 uppercase">
                {party.members.filter((m) => m.ready).length}/{party.members.length} READY
              </span>
            )}
            <span className="font-mono text-[9px] text-text-muted tracking-widest ml-auto">
              {party.member_count}/{party.max_players}
            </span>
          </div>

          {/* Ready up button for current member */}
          {(isMember || isCreator) && party.status !== "closed" && (
            <div className="mb-4">
              {(() => {
                const myMembership = party.members?.find((m) => m.user_id === currentUserId);
                const amReady = myMembership?.ready ?? false;
                const allReady = party.members?.every((m) => m.ready) && (party.members?.length ?? 0) > 0;
                return (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleToggleReady}
                      disabled={readyLoading}
                      className={[
                        "font-mono text-[10px] tracking-widest uppercase px-4 py-1.5 border transition-all",
                        amReady
                          ? "bg-accent/15 border-accent/40 text-accent"
                          : "bg-transparent border-border text-text-muted hover:border-accent/30 hover:text-text-dim",
                      ].join(" ")}
                    >
                      {readyLoading ? "..." : amReady ? "READY" : "READY UP"}
                    </button>
                    {allReady && (
                      <span className="font-mono text-[9px] tracking-widest text-accent animate-pulse uppercase">
                        All members ready!
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {(!party.members || party.members.length === 0) ? (
            <p className="font-mono text-[10px] text-text-muted tracking-widest text-center py-6">
              No members yet.
            </p>
          ) : (
            <div className="space-y-1">
              {party.members.map((member) => {
                const isOwner = member.user_id === party.creator_id;
                const profile = member.profiles;
                return (
                  <div
                    key={member.id}
                    className={[
                      "px-3 py-3 transition-colors",
                      isOwner ? "bg-accent/5 border-l-2 border-l-accent" : "hover:bg-bg-elevated border-l-2 border-l-transparent",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {/* Ready indicator dot */}
                        <span
                          className={[
                            "w-1.5 h-1.5 shrink-0 transition-colors",
                            member.ready ? "bg-accent" : "bg-text-muted/30",
                          ].join(" ")}
                          title={member.ready ? "Ready" : "Not ready"}
                        />
                        <span className="font-mono text-[11px] text-text-bright tracking-wider">
                          {profile?.callsign ?? "UNKNOWN"}
                        </span>
                        <span
                          className="font-mono text-[7px] tracking-widest uppercase px-1 py-0.5 border"
                          style={{
                            color: isOwner ? "#F0A500" : "#45A29E",
                            borderColor: isOwner ? "#F0A50040" : "#45A29E40",
                          }}
                        >
                          {isOwner ? "LEADER" : "MEMBER"}
                        </span>
                      </div>
                      {/* Kick button */}
                      {isCreator && !isOwner && party.status !== "closed" && (
                        <button
                          onClick={() => confirmThen(
                            `kick ${profile?.callsign ?? "this member"}`,
                            () => handleKick(member.user_id)
                          )}
                          disabled={kickingId === member.user_id}
                          className="font-mono text-[8px] tracking-widest text-danger/60 hover:text-danger uppercase transition-colors px-1"
                        >
                          {kickingId === member.user_id ? "..." : "KICK"}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-0.5">
                      {profile?.sc_handle ? (
                        <span className="font-mono text-[10px] text-accent tracking-wider">
                          RSI: {profile.sc_handle}
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] text-text-muted/40 tracking-widest">No RSI handle</span>
                      )}
                      {profile?.primary_ship && (
                        <span className="font-mono text-[9px] text-text-muted tracking-wider uppercase">
                          {profile.primary_ship}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="font-mono text-[8px] text-text-muted/50 tracking-widest leading-relaxed">
              Add party members in Star Citizen using their RSI handles above.
              Set yours in{" "}
              <Link href="/dashboard/settings" className="text-accent/50 hover:text-accent transition-colors">
                Settings
              </Link>.
            </p>
          </div>
        </div>

        {/* Party Chat */}
        <div className="mtc-panel bg-bg-surface p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-amber" />
            <h2 className="font-mono text-xs tracking-[0.25em] text-text-dim uppercase">
              Party Chat
            </h2>
            <span className="font-mono text-[8px] text-text-muted/50 tracking-widest ml-auto uppercase">
              {isMember || isCreator ? "live" : "join to chat"}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-[250px] max-h-[400px] overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin">
            {(isMember || isCreator) ? (
              messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="font-mono text-[10px] text-text-muted/40 tracking-widest">
                    No messages yet. Say something...
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.user_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-mono text-[8px] tracking-widest ${isMe ? "text-accent/70" : "text-amber/70"}`}>
                          {msg.profiles?.callsign ?? "UNKNOWN"}
                        </span>
                        <span className="font-mono text-[7px] text-text-muted/30 tracking-widest">
                          {getTimeShort(msg.created_at)}
                        </span>
                      </div>
                      <div
                        className={[
                          "px-3 py-1.5 max-w-[85%]",
                          isMe
                            ? "bg-accent/10 border border-accent/20"
                            : "bg-bg-elevated border border-border",
                        ].join(" ")}
                      >
                        <p className="font-mono text-[11px] text-text-dim tracking-wide break-words leading-relaxed">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="font-mono text-[10px] text-text-muted/40 tracking-widest">
                  Join the party to access chat.
                </p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {(isMember || isCreator) && party.status !== "closed" && (
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
                placeholder="Type a message..."
                maxLength={500}
                className="mtc-input font-mono text-[11px] flex-1"
              />
              <button
                type="submit"
                disabled={sending || !msgInput.trim()}
                className="mtc-btn-primary text-[10px] px-4"
              >
                {sending ? "..." : "SEND"}
              </button>
            </form>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getTimeShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
