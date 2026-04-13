"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageTransition from "@/components/page-transition";
import {
  PARTY_ACTIVITIES,
  PARTY_STATUS_LABELS,
  type PartyWithDetails,
  type PartyMessageWithProfile,
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

  // Real-time: refresh party data when changes happen
  const refreshParty = useCallback(async () => {
    const updated = await getParty(party.id);
    if (updated) setParty(updated);
  }, [party.id]);

  const refreshMessages = useCallback(async () => {
    const msgs = await getPartyMessages(party.id);
    setMessages(msgs);
  }, [party.id]);

  usePartyRealtime({
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

  async function handleAction(action: () => Promise<{ error?: string }>, redirectTo?: string) {
    setLoading(true);
    setError(null);
    const result = await action();
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (redirectTo) {
      router.push(redirectTo);
    } else {
      await refreshParty();
    }
  }

  async function handleKick(targetUserId: string) {
    setKickingId(targetUserId);
    const result = await kickMember(party.id, targetUserId);
    setKickingId(null);
    if (result.error) {
      setError(result.error);
    } else {
      await refreshParty();
    }
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
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 border border-danger/30 bg-danger/5 px-4 py-2">
          <p className="font-mono text-[10px] text-danger tracking-widest">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {!isMember && !isCreator && party.status === "open" && (
          <button
            onClick={() => handleAction(() => joinParty(party.id))}
            disabled={loading}
            className="mtc-btn-primary"
          >
            {loading ? "JOINING..." : "JOIN PARTY"}
          </button>
        )}
        {isMember && !isCreator && (
          <button
            onClick={() => handleAction(() => leaveParty(party.id), "/dashboard/parties")}
            disabled={loading}
            className="mtc-btn-ghost text-danger border-danger/30 hover:bg-danger/10"
          >
            {loading ? "LEAVING..." : "LEAVE PARTY"}
          </button>
        )}
        {isCreator && (
          <>
            {party.status === "open" && (
              <button
                onClick={() => handleAction(() => updatePartyStatus(party.id, "in_progress"))}
                disabled={loading}
                className="mtc-btn-primary"
              >
                START MISSION
              </button>
            )}
            {party.status === "in_progress" && (
              <button
                onClick={() => handleAction(() => updatePartyStatus(party.id, "open"))}
                disabled={loading}
                className="mtc-btn-ghost"
              >
                REOPEN
              </button>
            )}
            {party.status !== "closed" && (
              <button
                onClick={() => handleAction(() => closeParty(party.id), "/dashboard/parties")}
                disabled={loading}
                className="mtc-btn-ghost text-danger border-danger/30 hover:bg-danger/10"
              >
                CLOSE PARTY
              </button>
            )}
          </>
        )}
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
            <span className="font-mono text-[9px] text-text-muted tracking-widest ml-auto">
              {party.member_count}/{party.max_players}
            </span>
          </div>

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
                          onClick={() => handleKick(member.user_id)}
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
