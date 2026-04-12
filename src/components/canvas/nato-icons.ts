/**
 * NATO APP-6C Tactical Symbol Utilities
 *
 * Affiliation determines the frame shape:
 *   Friendly  → Rectangle  (cyan)
 *   Hostile   → Diamond    (red)
 *   Neutral   → Square     (amber)
 *   Unknown   → Circle     (purple)
 *
 * Unit type determines the interior symbol drawn inside the frame.
 */

import type { MarkerAffiliation, MarkerType } from "@/types/database";

// ─── Affiliation Colors ───────────────────────────────────────────────────────

export const AFFILIATION_COLORS: Record<MarkerAffiliation, string> = {
  friendly: "#00ffcc",
  hostile:  "#FF2442",
  neutral:  "#F0A500",
  unknown:  "#9B7FE8",
};

// ─── Frame Shapes (40 × 40 viewBox) ──────────────────────────────────────────

function frame(affiliation: MarkerAffiliation, color: string): string {
  const fill = "rgba(0,0,0,0.75)";
  switch (affiliation) {
    case "friendly":
      // Rectangle — NATO standard for friendly
      return `<rect x="3" y="9" width="34" height="22" fill="${fill}" stroke="${color}" stroke-width="2"/>`;
    case "hostile":
      // Diamond — NATO standard for hostile
      return `<path d="M20,2 L38,20 L20,38 L2,20 Z" fill="${fill}" stroke="${color}" stroke-width="2"/>`;
    case "neutral":
      // Square — NATO standard for neutral
      return `<rect x="4" y="4" width="32" height="32" fill="${fill}" stroke="${color}" stroke-width="2"/>`;
    case "unknown":
      // Circle — NATO standard for unknown
      return `<circle cx="20" cy="20" r="17" fill="${fill}" stroke="${color}" stroke-width="2"/>`;
  }
}

// ─── Interior Symbols ────────────────────────────────────────────────────────

function symbol(type: MarkerType, color: string): string {
  switch (type) {
    case "infantry":
      // X cross — standard infantry
      return `
        <line x1="11" y1="13" x2="29" y2="27" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="29" y1="13" x2="11" y2="27" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>`;

    case "armor":
      // Ellipse at bottom — standard armor
      return `<ellipse cx="20" cy="26" rx="9" ry="5" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;

    case "air":
      // Wing arc — air unit
      return `<path d="M6,22 C8,14 14,12 20,17 C26,12 32,14 34,22" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;

    case "naval":
      // Wave — naval unit
      return `<path d="M7,20 C10,16 13,24 16,20 C19,16 22,24 25,20 C28,16 31,24 34,20" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>`;

    case "artillery":
      // Circle with filled dot
      return `
        <circle cx="20" cy="21" r="7" fill="none" stroke="${color}" stroke-width="1.75"/>
        <circle cx="20" cy="21" r="2.5" fill="${color}"/>`;

    case "hq":
      // Vertical staff + flag
      return `
        <line x1="15" y1="12" x2="15" y2="28" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M15,13 L26,17 L15,21" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;

    case "recon":
      // Eye shape
      return `
        <path d="M9,20 C11,14 29,14 31,20 C29,26 11,26 9,20 Z" fill="none" stroke="${color}" stroke-width="1.75"/>
        <circle cx="20" cy="20" r="3" fill="${color}" opacity="0.9"/>`;

    case "medical":
      // Bold cross
      return `
        <line x1="20" y1="12" x2="20" y2="28" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
        <line x1="12" y1="20" x2="28" y2="20" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;

    case "logistics":
      // Up arrow
      return `
        <line x1="20" y1="13" x2="20" y2="27" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <polyline points="13,20 20,13 27,20" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;

    case "custom":
    default:
      // 5-pointed star
      return `<polygon points="20,11 22.6,17.9 30,17.9 24.3,22.1 26.5,29 20,25.1 13.5,29 15.7,22.1 10,17.9 17.4,17.9" fill="none" stroke="${color}" stroke-width="1.75" stroke-linejoin="round"/>`;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns a full SVG string for a NATO marker (40×40). */
export function getNatoSvg(
  type: MarkerType,
  affiliation: MarkerAffiliation
): string {
  const color = AFFILIATION_COLORS[affiliation];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    ${frame(affiliation, color)}
    ${symbol(type, color)}
  </svg>`;
}

/** Returns a data URL suitable for use as an <img> src or Fabric FabricImage. */
export function getNatoDataUrl(
  type: MarkerType,
  affiliation: MarkerAffiliation
): string {
  const svg = getNatoSvg(type, affiliation);
  // btoa works in browser; safe here since all characters are ASCII
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export const MARKER_TYPE_LABELS: Record<MarkerType, string> = {
  infantry:  "Infantry",
  armor:     "Armor",
  air:       "Air",
  naval:     "Naval",
  artillery: "Artillery",
  hq:        "HQ",
  recon:     "Recon",
  medical:   "Medical",
  logistics: "Logistics",
  custom:    "Custom",
};

/** Star Citizen-specific labels mapping to the same marker types */
export const SC_MARKER_TYPE_LABELS: Record<MarkerType, string> = {
  infantry:  "FPS Team",
  armor:     "Ground Veh",
  air:       "Fighters",
  naval:     "Capital Ship",
  artillery: "Bombers",
  hq:        "Flagship",
  recon:     "Scouts",
  medical:   "Medical",
  logistics: "Cargo/Supply",
  custom:    "POI",
};

/** Star Citizen-specific descriptions for tooltips */
export const SC_MARKER_TYPE_DESCRIPTIONS: Record<MarkerType, string> = {
  infantry:  "FPS Team — Ground forces, marines, boarding party",
  armor:     "Ground Vehicle — Tonk, Ballista, Ursa, ROC, Centurion",
  air:       "Fighters — Gladius, Arrow, Sabre, Hornet, Vanguard",
  naval:     "Capital Ship — Hammerhead, Idris, Javelin, Polaris, Perseus",
  artillery: "Bombers — Retaliator, Eclipse, Ares, A2 Hercules",
  hq:        "Flagship — Command vessel, Carrack, 890 Jump",
  recon:     "Scouts — Terrapin, Herald, DUR, Pisces",
  medical:   "Medical — Cutlass Red, Apollo, med station",
  logistics: "Cargo/Supply — Hull C, Caterpillar, C2 Hercules, RAFT",
  custom:    "Point of Interest — Comm array, outpost, cave, wreck",
};

export const AFFILIATION_LABELS: Record<MarkerAffiliation, string> = {
  friendly: "Friendly",
  hostile:  "Hostile",
  neutral:  "Neutral",
  unknown:  "Unknown",
};

/** Star Citizen-specific affiliation labels */
export const SC_AFFILIATION_LABELS: Record<MarkerAffiliation, string> = {
  friendly: "Org/Allied",
  hostile:  "Hostile/PvP",
  neutral:  "Civilian",
  unknown:  "Unidentified",
};

export type IconLabelMode = "nato" | "sc";

export const ALL_MARKER_TYPES: MarkerType[] = [
  "infantry", "armor", "air", "naval", "artillery",
  "hq", "recon", "medical", "logistics", "custom",
];

export const ALL_AFFILIATIONS: MarkerAffiliation[] = [
  "friendly", "hostile", "neutral", "unknown",
];
