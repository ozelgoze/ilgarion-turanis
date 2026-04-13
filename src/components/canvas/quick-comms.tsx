"use client";

import { useState, useEffect, useRef } from "react";

// ── Tactical Callout Definitions ────────────────────────────────────────────

interface Callout {
  label: string;
  abbr: string;
  color: string;
}

const CALLOUT_CATEGORIES: { category: string; callouts: Callout[] }[] = [
  {
    category: "Movement",
    callouts: [
      { label: "Moving to position", abbr: "OSCAR MIKE", color: "#00ffcc" },
      { label: "In position / set", abbr: "SET", color: "#00ffcc" },
      { label: "Falling back", abbr: "FALL BACK", color: "#F0A500" },
      { label: "Rally at RP", abbr: "RALLY", color: "#F0A500" },
    ],
  },
  {
    category: "Contact",
    callouts: [
      { label: "Enemy contact", abbr: "CONTACT", color: "#FF2442" },
      { label: "Hostile down", abbr: "TANGO DOWN", color: "#FF6B35" },
      { label: "Area clear", abbr: "CLEAR", color: "#00ffcc" },
      { label: "Taking fire", abbr: "TAKING FIRE", color: "#FF2442" },
    ],
  },
  {
    category: "Status",
    callouts: [
      { label: "Ready / standing by", abbr: "STANDING BY", color: "#00ffcc" },
      { label: "Need assistance", abbr: "NEED SUPPORT", color: "#FF8C00" },
      { label: "Medical needed", abbr: "MEDIC", color: "#FF2442" },
      { label: "Quantum ready", abbr: "QT READY", color: "#70B8E0" },
    ],
  },
  {
    category: "Orders",
    callouts: [
      { label: "Hold position", abbr: "HOLD", color: "#F0A500" },
      { label: "Weapons free", abbr: "WEAPONS FREE", color: "#FF2442" },
      { label: "Cease fire", abbr: "CEASE FIRE", color: "#F0A500" },
      { label: "Execute execute", abbr: "EXECUTE", color: "#FF2442" },
    ],
  },
];

// ── Toast notification for incoming callouts ────────────────────────────────

interface CalloutToast {
  id: number;
  callsign: string;
  abbr: string;
  color: string;
  timestamp: number;
}

interface QuickCommsProps {
  currentCallsign: string;
  onBroadcastCallout?: (abbr: string, color: string) => void;
}

export interface IncomingCallout {
  callsign: string;
  abbr: string;
  color: string;
}

let toastId = 0;

export default function QuickComms({ currentCallsign, onBroadcastCallout }: QuickCommsProps) {
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<CalloutToast[]>([]);
  const toastTimeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  function sendCallout(callout: Callout) {
    onBroadcastCallout?.(callout.abbr, callout.color);
    // Show own callout locally too
    addToast(currentCallsign, callout.abbr, callout.color);
    setOpen(false);
  }

  function addToast(callsign: string, abbr: string, color: string) {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-4), { id, callsign, abbr, color, timestamp: Date.now() }]);
    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      toastTimeouts.current.delete(id);
    }, 4000);
    toastTimeouts.current.set(id, timeout);
  }

  // Expose addToast for external incoming callouts
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__quickCommsAddToast = addToast;
    return () => {
      delete (window as unknown as Record<string, unknown>).__quickCommsAddToast;
    };
  });

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      toastTimeouts.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <>
      {/* Comms Button */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 h-7 font-mono text-[11px] tracking-widest uppercase border border-transparent text-text-dim hover:text-text-primary transition-colors"
          title="Quick Comms — tactical callouts"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          COMMS
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div className="absolute top-full right-0 mt-1 w-52 bg-bg-surface border border-border z-30 max-h-[60vh] overflow-y-auto">
              <div className="px-3 py-2 border-b border-border sticky top-0 bg-bg-surface z-10">
                <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  Quick Comms — Tap to Send
                </span>
              </div>

              {CALLOUT_CATEGORIES.map((cat) => (
                <div key={cat.category}>
                  <div className="px-3 py-1 bg-bg-elevated border-b border-border">
                    <span className="font-mono text-[7px] tracking-widest text-text-muted/60 uppercase">
                      {cat.category}
                    </span>
                  </div>
                  {cat.callouts.map((callout) => (
                    <button
                      key={callout.abbr}
                      onClick={() => sendCallout(callout)}
                      className="w-full px-3 py-1.5 text-left font-mono text-[10px] tracking-widest uppercase hover:bg-bg-elevated transition-colors border-b border-border/30 flex items-center justify-between gap-2"
                      title={callout.label}
                    >
                      <span style={{ color: callout.color }}>{callout.abbr}</span>
                      <span className="text-[7px] text-text-muted/50 truncate">{callout.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Toast Overlay — top-right of canvas */}
      {toasts.length > 0 && (
        <div className="fixed top-14 right-4 z-[9998] flex flex-col gap-1.5 pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-bg-primary/95 border px-3 py-2 backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-200"
              style={{ borderColor: `${toast.color}40` }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                  {toast.callsign}
                </span>
                <span className="w-px h-3 bg-border" />
                <span
                  className="font-mono text-[11px] tracking-widest uppercase font-bold"
                  style={{ color: toast.color }}
                >
                  {toast.abbr}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
