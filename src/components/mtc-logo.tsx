import Image from "next/image";

export default function AppLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = { sm: 48, md: 64, lg: 80 }[size];
  const nameSz = { sm: "13px", md: "17px", lg: "22px" }[size];
  const subSz  = { sm: "7px",  md: "9px",  lg: "11px" }[size];

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Aegis Dynamics Branding */}
      <div className="relative group">
        <Image
          src="/AEGIS_DYNAMICS_WHITE.png"
          alt="Aegis Dynamics"
          width={dims}
          height={dims}
          className="opacity-90 transition-opacity duration-500 group-hover:opacity-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]"
          priority
        />
        {/* Subtle scanline overlay on logo */}
        <div className="absolute inset-0 pointer-events-none bg-scanlines opacity-10 rounded-sm"></div>
      </div>

      {/* Wordmark */}
      <div className="text-center mt-2">
        <div
          className="font-mono font-bold tracking-[0.4em] text-accent mtc-glow-text"
          style={{ fontSize: nameSz }}
        >
          UEE ATAK APP
        </div>
        <div
          className="font-mono tracking-[0.2em] text-text-dim/60 uppercase mt-0.5"
          style={{ fontSize: subSz }}
        >
          ILGARION TURANIS [SCG]
        </div>
      </div>
    </div>
  );
}
