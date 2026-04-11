export default function MtcLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = { sm: 36, md: 48, lg: 64 }[size];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hex icon */}
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="MTC Logo"
      >
        {/* Outer hex */}
        <polygon
          points="24,2 44,13 44,35 24,46 4,35 4,13"
          stroke="#00ffcc"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        {/* Inner hex */}
        <polygon
          points="24,8 38,16 38,32 24,40 10,32 10,16"
          stroke="#00ffcc"
          strokeWidth="0.75"
          fill="rgba(0,255,204,0.05)"
          opacity="0.8"
        />
        {/* Cross-hairs */}
        <line x1="24" y1="2" x2="24" y2="46" stroke="#00ffcc" strokeWidth="0.5" opacity="0.25" />
        <line x1="4" y1="24" x2="44" y2="24" stroke="#00ffcc" strokeWidth="0.5" opacity="0.25" />
        {/* Center dot */}
        <circle cx="24" cy="24" r="3" fill="#00ffcc" opacity="0.9" />
        <circle cx="24" cy="24" r="6" stroke="#00ffcc" strokeWidth="0.75" fill="none" opacity="0.4" />
      </svg>

      {/* Wordmark */}
      <div className="text-center">
        <div
          className="font-mono font-bold tracking-[0.4em] text-accent mtc-glow-text"
          style={{ fontSize: size === "sm" ? "14px" : size === "md" ? "18px" : "24px" }}
        >
          MTC
        </div>
        <div
          className="font-mono tracking-[0.25em] text-text-dim uppercase"
          style={{ fontSize: size === "sm" ? "7px" : size === "md" ? "9px" : "11px" }}
        >
          Mythra Tactical Command
        </div>
      </div>
    </div>
  );
}
