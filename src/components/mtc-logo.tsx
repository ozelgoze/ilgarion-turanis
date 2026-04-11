export default function AppLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = { sm: 40, md: 56, lg: 72 }[size];
  const nameSz = { sm: "13px", md: "17px", lg: "22px" }[size];
  const subSz  = { sm: "7px",  md: "9px",  lg: "11px" }[size];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* UEE Eagle */}
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="UEE Logo"
      >
        {/* Outer ring */}
        <circle cx="32" cy="32" r="30" stroke="#00ffcc" strokeWidth="0.8" opacity="0.45" />
        <circle cx="32" cy="32" r="27" stroke="#00ffcc" strokeWidth="0.4" opacity="0.2"  />

        {/* ── LEFT WING ───────────────────────── */}
        {/* Main wing shape */}
        <path
          d="M28 27 L21 20 L11 18 L4 23 L10 26 L4 31 L12 29 L17 33 L24 28 Z"
          stroke="#00ffcc" strokeWidth="1.2" strokeLinejoin="round"
          fill="rgba(0,255,204,0.06)"
        />
        {/* Feather detail lines */}
        <line x1="18" y1="22" x2="13" y2="29" stroke="#00ffcc" strokeWidth="0.5" opacity="0.45" />
        <line x1="10" y1="25" x2="6"  y2="31" stroke="#00ffcc" strokeWidth="0.5" opacity="0.35" />

        {/* ── RIGHT WING (mirror) ──────────────── */}
        <path
          d="M36 27 L43 20 L53 18 L60 23 L54 26 L60 31 L52 29 L47 33 L40 28 Z"
          stroke="#00ffcc" strokeWidth="1.2" strokeLinejoin="round"
          fill="rgba(0,255,204,0.06)"
        />
        <line x1="46" y1="22" x2="51" y2="29" stroke="#00ffcc" strokeWidth="0.5" opacity="0.45" />
        <line x1="54" y1="25" x2="58" y2="31" stroke="#00ffcc" strokeWidth="0.5" opacity="0.35" />

        {/* ── BODY / SHIELD ────────────────────── */}
        <path
          d="M27 20 L32 14 L37 20 L37 41 L32 48 L27 41 Z"
          stroke="#00ffcc" strokeWidth="1.2"
          fill="rgba(0,255,204,0.08)"
        />
        {/* Shield center line */}
        <line x1="32" y1="20" x2="32" y2="41" stroke="#00ffcc" strokeWidth="0.5" opacity="0.3" />

        {/* ── HEAD ─────────────────────────────── */}
        <path
          d="M28 10 L33 7 L38 10 L37 15 L32 16 L27 15 Z"
          stroke="#00ffcc" strokeWidth="1.2"
          fill="rgba(0,255,204,0.13)"
        />

        {/* ── BEAK (facing right) ───────────────── */}
        <path
          d="M38 10 L45 12 L38 14 Z"
          stroke="#00ffcc" strokeWidth="1"
          fill="rgba(0,255,204,0.2)"
        />

        {/* ── EYE ──────────────────────────────── */}
        <circle cx="34" cy="11" r="1.5" fill="#00ffcc" opacity="0.9" />

        {/* ── TALONS ───────────────────────────── */}
        {/* Left foot */}
        <path
          d="M29 44 L25 51 L27 52 L30 49 L32 52"
          stroke="#00ffcc" strokeWidth="1" strokeLinecap="round" fill="none"
        />
        {/* Right foot */}
        <path
          d="M35 44 L39 51 L37 52 L34 49 L32 52"
          stroke="#00ffcc" strokeWidth="1" strokeLinecap="round" fill="none"
        />

        {/* ── RING DOTS (UEE decoration) ────────── */}
        <circle cx="32" cy="3"  r="1" fill="#00ffcc" opacity="0.5" />
        <circle cx="32" cy="61" r="1" fill="#00ffcc" opacity="0.5" />
        <circle cx="3"  cy="32" r="1" fill="#00ffcc" opacity="0.5" />
        <circle cx="61" cy="32" r="1" fill="#00ffcc" opacity="0.5" />
      </svg>

      {/* Wordmark */}
      <div className="text-center">
        <div
          className="font-mono font-bold tracking-[0.35em] text-accent mtc-glow-text"
          style={{ fontSize: nameSz }}
        >
          UEE ATAK APP
        </div>
        <div
          className="font-mono tracking-[0.2em] text-text-dim uppercase mt-0.5"
          style={{ fontSize: subSz }}
        >
          ILGARION TURANIS [SCG]
        </div>
      </div>
    </div>
  );
}
