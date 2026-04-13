"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface OpTimerProps {
  onBroadcastTimer?: (targetTime: number | null) => void;
  externalTargetTime?: number | null;
}

const PRESETS = [
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "2m", seconds: 120 },
  { label: "5m", seconds: 300 },
  { label: "10m", seconds: 600 },
];

export default function OpTimer({ onBroadcastTimer, externalTargetTime }: OpTimerProps) {
  const [open, setOpen] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [customMin, setCustomMin] = useState("");
  const [customSec, setCustomSec] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync from external broadcast
  useEffect(() => {
    if (externalTargetTime !== undefined && externalTargetTime !== null) {
      setTargetTime(externalTargetTime);
    } else if (externalTargetTime === null) {
      setTargetTime(null);
      setRemaining(0);
    }
  }, [externalTargetTime]);

  // Tick the countdown
  useEffect(() => {
    if (targetTime === null) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    function tick() {
      const diff = Math.max(0, Math.ceil((targetTime! - Date.now()) / 1000));
      setRemaining(diff);
      if (diff <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    tick();
    intervalRef.current = setInterval(tick, 250);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [targetTime]);

  const startTimer = useCallback((seconds: number) => {
    const target = Date.now() + seconds * 1000;
    setTargetTime(target);
    onBroadcastTimer?.(target);
    setOpen(false);
  }, [onBroadcastTimer]);

  const cancelTimer = useCallback(() => {
    setTargetTime(null);
    setRemaining(0);
    onBroadcastTimer?.(null);
  }, [onBroadcastTimer]);

  const handleCustomStart = useCallback(() => {
    const mins = parseInt(customMin) || 0;
    const secs = parseInt(customSec) || 0;
    const total = mins * 60 + secs;
    if (total > 0) {
      startTimer(total);
      setCustomMin("");
      setCustomSec("");
    }
  }, [customMin, customSec, startTimer]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isActive = targetTime !== null && remaining > 0;
  const isExpired = targetTime !== null && remaining <= 0;
  const urgencyColor = remaining <= 10 && isActive ? "#FF2442" : remaining <= 30 && isActive ? "#FF8C00" : "#00ffcc";

  return (
    <div className="relative">
      {/* Timer Button / Display */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-1.5 px-2.5 h-7 font-mono text-[11px] tracking-widest uppercase border transition-colors",
          isActive
            ? "border-accent/40 bg-accent/10"
            : isExpired
              ? "border-amber/40 text-amber bg-amber/10"
              : "border-transparent text-text-dim hover:text-text-primary",
        ].join(" ")}
        style={isActive ? { color: urgencyColor, borderColor: `${urgencyColor}40` } : undefined}
        title="Operation Timer"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="13" r="8" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="13" x2="15" y2="13" />
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="9" y1="2" x2="15" y2="2" />
        </svg>
        {isActive ? formatTime(remaining) : isExpired ? "MARK" : "TIMER"}
      </button>

      {/* Dropdown panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 w-56 bg-bg-surface border border-border z-30">
            <div className="px-3 py-2 border-b border-border">
              <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">
                Op Timer — Sync Countdown
              </span>
            </div>

            {/* Active timer display */}
            {(isActive || isExpired) && (
              <div className="px-3 py-3 border-b border-border text-center">
                <div
                  className={[
                    "font-mono text-2xl tracking-widest tabular-nums",
                    isExpired ? "text-amber animate-pulse" : "",
                  ].join(" ")}
                  style={isActive ? { color: urgencyColor } : undefined}
                >
                  {isExpired ? "00:00" : formatTime(remaining)}
                </div>
                <p className="font-mono text-[8px] tracking-widest text-text-muted uppercase mt-1">
                  {isExpired ? "Timer expired — execute execute execute" : "Countdown active"}
                </p>
                <button
                  onClick={cancelTimer}
                  className="mt-2 px-3 py-1 font-mono text-[9px] tracking-widest text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors uppercase"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Presets */}
            {!isActive && !isExpired && (
              <>
                <div className="px-3 py-2 border-b border-border">
                  <p className="font-mono text-[8px] tracking-widest text-text-muted uppercase mb-2">
                    Quick Start
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => startTimer(p.seconds)}
                        className="flex-1 min-w-[40px] py-1.5 font-mono text-[10px] tracking-widest uppercase border border-border text-text-dim hover:border-accent/50 hover:text-accent transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-2">
                  <p className="font-mono text-[8px] tracking-widest text-text-muted uppercase mb-2">
                    Custom
                  </p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customMin}
                      onChange={(e) => setCustomMin(e.target.value)}
                      placeholder="MM"
                      className="w-14 bg-bg-primary border border-border px-1.5 py-1 font-mono text-[11px] text-text-bright text-center focus:border-accent/50 focus:outline-none"
                      onKeyDown={(e) => { if (e.key === "Enter") handleCustomStart(); }}
                    />
                    <span className="font-mono text-text-muted">:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customSec}
                      onChange={(e) => setCustomSec(e.target.value)}
                      placeholder="SS"
                      className="w-14 bg-bg-primary border border-border px-1.5 py-1 font-mono text-[11px] text-text-bright text-center focus:border-accent/50 focus:outline-none"
                      onKeyDown={(e) => { if (e.key === "Enter") handleCustomStart(); }}
                    />
                    <button
                      onClick={handleCustomStart}
                      className="px-2 py-1 font-mono text-[9px] tracking-widest text-accent border border-accent/40 hover:bg-accent/10 transition-colors uppercase"
                    >
                      Go
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
