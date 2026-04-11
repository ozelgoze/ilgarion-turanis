export default function AppLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = { sm: 40, md: 56, lg: 72 }[size];
  const nameSz = { sm: "13px", md: "17px", lg: "22px" }[size];
  const subSz  = { sm: "7px",  md: "9px",  lg: "11px" }[size];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* UEE Eagle — heraldic front-facing eagle, head right */}
      <svg
        width={dims}
        height={dims}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="UEE Logo"
      >
        {/* ── OUTER RING ────────────────────────────────── */}
        <circle cx="50" cy="50" r="48" stroke="#00ffcc" strokeWidth="1.2" opacity="0.35" />
        <circle cx="50" cy="50" r="44" stroke="#00ffcc" strokeWidth="0.5" opacity="0.15" />

        {/* ── LEFT WING (viewer left, eagle's right) ──────
            Sweeps up and out from body, layered feathers  */}
        {/* Wing base / covert */}
        <path
          d="M42 46 L30 36 L16 30 L6  33 L10 40 L6  48 L14 44 L22 50 L34 44 Z"
          stroke="#00ffcc" strokeWidth="1.4" strokeLinejoin="round"
          fill="rgba(0,255,204,0.07)"
        />
        {/* Primary feathers fanning down-left */}
        <path
          d="M22 50 L10 58 L8  65" stroke="#00ffcc" strokeWidth="1.1"
          strokeLinecap="round" opacity="0.75"
        />
        <path
          d="M28 53 L18 62 L16 70" stroke="#00ffcc" strokeWidth="1.1"
          strokeLinecap="round" opacity="0.65"
        />
        <path
          d="M34 54 L26 64 L25 72" stroke="#00ffcc" strokeWidth="1.1"
          strokeLinecap="round" opacity="0.55"
        />
        {/* Feather split lines on wing covert */}
        <line x1="22" y1="36" x2="16" y2="44" stroke="#00ffcc" strokeWidth="0.6" opacity="0.4" />
        <line x1="12" y1="37" x2="7"  y2="44" stroke="#00ffcc" strokeWidth="0.6" opacity="0.3" />

        {/* ── RIGHT WING (viewer right, eagle's left) ─────*/}
        <path
          d="M58 46 L70 36 L84 30 L94 33 L90 40 L94 48 L86 44 L78 50 L66 44 Z"
          stroke="#00ffcc" strokeWidth="1.4" strokeLinejoin="round"
          fill="rgba(0,255,204,0.07)"
        />
        <path
          d="M78 50 L90 58 L92 65" stroke="#00ffcc" strokeWidth="1.1"
          strokeLinecap="round" opacity="0.75"
        />
        <path
          d="M72 53 L82 62 L84 70" stroke="#00ffcc" strokeWidth="1.1"
          strokeLinecap="round" opacity="0.65"
        />
        <path
          d="M66 54 L74 64 L75 72" stroke="#00ffcc" strokeWidth="1.1"
          strokeLinecap="round" opacity="0.55"
        />
        <line x1="78" y1="36" x2="84" y2="44" stroke="#00ffcc" strokeWidth="0.6" opacity="0.4" />
        <line x1="88" y1="37" x2="93" y2="44" stroke="#00ffcc" strokeWidth="0.6" opacity="0.3" />

        {/* ── BODY / SHIELD ─────────────────────────────── */}
        <path
          d="M42 38 L50 28 L58 38 L58 65 L54 74 L50 78 L46 74 L42 65 Z"
          stroke="#00ffcc" strokeWidth="1.5"
          fill="rgba(0,255,204,0.09)"
        />
        {/* Shield center divide */}
        <line x1="50" y1="38" x2="50" y2="68" stroke="#00ffcc" strokeWidth="0.6" opacity="0.25" />
        {/* Shield horizontal bar */}
        <line x1="43" y1="52" x2="57" y2="52" stroke="#00ffcc" strokeWidth="0.6" opacity="0.25" />

        {/* ── NECK ──────────────────────────────────────── */}
        <path
          d="M45 28 L50 20 L55 28 L53 34 L47 34 Z"
          stroke="#00ffcc" strokeWidth="1.3"
          fill="rgba(0,255,204,0.12)"
        />

        {/* ── HEAD (facing right) ───────────────────────── */}
        <path
          d="M46 14 L52 10 L59 13 L60 20 L55 24 L48 23 L44 19 Z"
          stroke="#00ffcc" strokeWidth="1.3"
          fill="rgba(0,255,204,0.14)"
        />

        {/* ── BEAK (hook, pointing right) ───────────────── */}
        <path
          d="M59 14 L68 17 L65 21 L59 19 Z"
          stroke="#00ffcc" strokeWidth="1.1"
          fill="rgba(0,255,204,0.22)"
        />

        {/* ── EYE ───────────────────────────────────────── */}
        <circle cx="54" cy="17" r="2" fill="#00ffcc" opacity="0.9" />
        <circle cx="54" cy="17" r="3.5" stroke="#00ffcc" strokeWidth="0.7" opacity="0.4" fill="none" />

        {/* ── CREST / HEAD FEATHERS ─────────────────────── */}
        <path
          d="M50 10 L48 4 M50 10 L52 3 M50 10 L46 6"
          stroke="#00ffcc" strokeWidth="0.9" strokeLinecap="round" opacity="0.6"
        />

        {/* ── TAIL FEATHERS ─────────────────────────────── */}
        <path
          d="M46 74 L42 82 L45 84 M50 78 L50 86 M54 74 L58 82 L55 84"
          stroke="#00ffcc" strokeWidth="1" strokeLinecap="round" opacity="0.7"
        />

        {/* ── LEFT TALON ────────────────────────────────── */}
        <path
          d="M44 68 L40 76 M40 76 L36 80 M40 76 L38 82 M40 76 L43 82"
          stroke="#00ffcc" strokeWidth="0.9" strokeLinecap="round" opacity="0.75"
        />

        {/* ── RIGHT TALON ───────────────────────────────── */}
        <path
          d="M56 68 L60 76 M60 76 L64 80 M60 76 L62 82 M60 76 L57 82"
          stroke="#00ffcc" strokeWidth="0.9" strokeLinecap="round" opacity="0.75"
        />

        {/* ── CARDINAL DOTS (UEE insignia detail) ───────── */}
        <circle cx="50" cy="2"  r="1.2" fill="#00ffcc" opacity="0.5" />
        <circle cx="50" cy="98" r="1.2" fill="#00ffcc" opacity="0.5" />
        <circle cx="2"  cy="50" r="1.2" fill="#00ffcc" opacity="0.5" />
        <circle cx="98" cy="50" r="1.2" fill="#00ffcc" opacity="0.5" />
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
