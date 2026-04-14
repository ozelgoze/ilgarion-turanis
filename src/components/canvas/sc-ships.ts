/**
 * Star Citizen ship database for marker assignment, hangar, and fleet management.
 * Organized by role category for quick selection.
 *
 * Data sources: RSI ship matrix, community wikis.
 * Maintained as static data — no DB needed.
 */

import type { ShipSize } from "@/types/database";

export interface ShipEntry {
  name: string;
  manufacturer: string;
  /** Short 3-4 char abbreviation for tight label display */
  abbr: string;
  size: ShipSize;
  crew: { min: number; max: number };
  cargo: number;  // SCU
  role: string;
  flightReady: boolean;
}

export interface ShipCategory {
  id: string;
  label: string;
  color: string;
  ships: ShipEntry[];
}

export const SC_SHIP_CATEGORIES: ShipCategory[] = [
  {
    id: "fighter",
    label: "Fighters",
    color: "#00AAFF",
    ships: [
      { name: "Gladius", manufacturer: "Aegis", abbr: "GLAD", size: "s", crew: { min: 1, max: 1 }, cargo: 0, role: "Light Fighter", flightReady: true },
      { name: "Arrow", manufacturer: "Anvil", abbr: "ARRW", size: "s", crew: { min: 1, max: 1 }, cargo: 0, role: "Light Fighter", flightReady: true },
      { name: "Sabre", manufacturer: "Aegis", abbr: "SABR", size: "s", crew: { min: 1, max: 1 }, cargo: 0, role: "Stealth Fighter", flightReady: true },
      { name: "Hornet F7C", manufacturer: "Anvil", abbr: "F7C", size: "s", crew: { min: 1, max: 1 }, cargo: 0, role: "Medium Fighter", flightReady: true },
      { name: "Hornet F7A", manufacturer: "Anvil", abbr: "F7A", size: "s", crew: { min: 1, max: 1 }, cargo: 0, role: "Military Fighter", flightReady: true },
      { name: "Buccaneer", manufacturer: "Drake", abbr: "BUCK", size: "s", crew: { min: 1, max: 1 }, cargo: 0, role: "Interdiction Fighter", flightReady: true },
      { name: "Blade", manufacturer: "Esperia", abbr: "BLDE", size: "s", crew: { min: 1, max: 1 }, cargo: 0, role: "Light Fighter", flightReady: true },
      { name: "Talon", manufacturer: "Esperia", abbr: "TLON", size: "s", crew: { min: 1, max: 1 }, cargo: 0, role: "Light Fighter", flightReady: true },
      { name: "Scorpius", manufacturer: "RSI", abbr: "SCOR", size: "m", crew: { min: 1, max: 2 }, cargo: 0, role: "Heavy Fighter", flightReady: true },
      { name: "Fury", manufacturer: "Mirai", abbr: "FURY", size: "xs", crew: { min: 1, max: 1 }, cargo: 0, role: "Snub Fighter", flightReady: true },
      { name: "Fury MX", manufacturer: "Mirai", abbr: "FYMX", size: "xs", crew: { min: 1, max: 1 }, cargo: 0, role: "Snub Fighter", flightReady: true },
      { name: "San'tok.yāi", manufacturer: "Aopoa", abbr: "STYI", size: "m", crew: { min: 1, max: 1 }, cargo: 0, role: "Medium Fighter", flightReady: true },
    ],
  },
  {
    id: "heavy_fighter",
    label: "Heavy Fighters",
    color: "#5B9BD5",
    ships: [
      { name: "Vanguard Warden", manufacturer: "Aegis", abbr: "VG-W", size: "l", crew: { min: 1, max: 2 }, cargo: 0, role: "Heavy Fighter", flightReady: true },
      { name: "Vanguard Sentinel", manufacturer: "Aegis", abbr: "VG-S", size: "l", crew: { min: 1, max: 2 }, cargo: 0, role: "EWar Fighter", flightReady: true },
      { name: "Vanguard Harbinger", manufacturer: "Aegis", abbr: "VG-H", size: "l", crew: { min: 1, max: 2 }, cargo: 0, role: "Bomber Fighter", flightReady: true },
      { name: "Hurricane", manufacturer: "Anvil", abbr: "HURR", size: "m", crew: { min: 1, max: 2 }, cargo: 0, role: "Heavy Fighter", flightReady: true },
      { name: "Ares Inferno", manufacturer: "Crusader", abbr: "INRN", size: "m", crew: { min: 1, max: 1 }, cargo: 0, role: "Heavy Fighter", flightReady: true },
      { name: "Ares Ion", manufacturer: "Crusader", abbr: "ION", size: "m", crew: { min: 1, max: 1 }, cargo: 0, role: "Heavy Fighter", flightReady: true },
      { name: "Storm", manufacturer: "Aegis", abbr: "STRM", size: "m", crew: { min: 1, max: 2 }, cargo: 0, role: "Heavy Fighter", flightReady: false },
    ],
  },
  {
    id: "bomber",
    label: "Bombers / Torpedo",
    color: "#FF6B35",
    ships: [
      { name: "Eclipse", manufacturer: "Aegis", abbr: "ECLP", size: "m", crew: { min: 1, max: 1 }, cargo: 0, role: "Stealth Bomber", flightReady: true },
      { name: "Retaliator", manufacturer: "Aegis", abbr: "RETA", size: "l", crew: { min: 1, max: 7 }, cargo: 0, role: "Heavy Bomber", flightReady: true },
      { name: "A2 Hercules", manufacturer: "Crusader", abbr: "A2", size: "xl", crew: { min: 2, max: 5 }, cargo: 234, role: "Gunship / Bomber", flightReady: true },
      { name: "Gladiator", manufacturer: "Anvil", abbr: "GLDT", size: "s", crew: { min: 1, max: 2 }, cargo: 0, role: "Torpedo Bomber", flightReady: true },
    ],
  },
  {
    id: "multicrew",
    label: "Multicrew / Gunships",
    color: "#FF2442",
    ships: [
      { name: "Cutlass Black", manufacturer: "Drake", abbr: "CUT-B", size: "m", crew: { min: 1, max: 3 }, cargo: 46, role: "Medium Freighter", flightReady: true },
      { name: "Cutlass Blue", manufacturer: "Drake", abbr: "CUT-L", size: "m", crew: { min: 1, max: 3 }, cargo: 12, role: "Bounty Hunter", flightReady: true },
      { name: "Freelancer MIS", manufacturer: "MISC", abbr: "FL-M", size: "m", crew: { min: 1, max: 4 }, cargo: 28, role: "Missile Boat", flightReady: true },
      { name: "Constellation Andromeda", manufacturer: "RSI", abbr: "ANDRO", size: "l", crew: { min: 1, max: 4 }, cargo: 96, role: "Multicrew Fighter", flightReady: true },
      { name: "Constellation Aquila", manufacturer: "RSI", abbr: "AQULA", size: "l", crew: { min: 1, max: 4 }, cargo: 72, role: "Exploration", flightReady: true },
      { name: "Redeemer", manufacturer: "Aegis", abbr: "REDM", size: "l", crew: { min: 1, max: 5 }, cargo: 0, role: "Gunship", flightReady: true },
      { name: "Corsair", manufacturer: "Drake", abbr: "CORS", size: "l", crew: { min: 1, max: 4 }, cargo: 72, role: "Explorer / Gunship", flightReady: true },
      { name: "Spirit A1", manufacturer: "Crusader", abbr: "SP-A", size: "m", crew: { min: 1, max: 2 }, cargo: 0, role: "Bomber", flightReady: true },
      { name: "Spirit C1", manufacturer: "Crusader", abbr: "SP-C", size: "m", crew: { min: 1, max: 2 }, cargo: 64, role: "Freight", flightReady: true },
      { name: "Spirit E1", manufacturer: "Crusader", abbr: "SP-E", size: "m", crew: { min: 1, max: 2 }, cargo: 0, role: "VIP Transport", flightReady: false },
    ],
  },
  {
    id: "capital",
    label: "Capital Ships",
    color: "#9B7FE8",
    ships: [
      { name: "Hammerhead", manufacturer: "Aegis", abbr: "HH", size: "capital", crew: { min: 3, max: 8 }, cargo: 0, role: "Anti-Fighter Corvette", flightReady: true },
      { name: "Polaris", manufacturer: "RSI", abbr: "POLR", size: "capital", crew: { min: 6, max: 14 }, cargo: 216, role: "Corvette", flightReady: true },
      { name: "Perseus", manufacturer: "RSI", abbr: "PERS", size: "capital", crew: { min: 4, max: 6 }, cargo: 80, role: "Anti-Capital Corvette", flightReady: false },
      { name: "Idris-M", manufacturer: "Aegis", abbr: "IDRS", size: "capital", crew: { min: 10, max: 38 }, cargo: 860, role: "Frigate", flightReady: false },
      { name: "Javelin", manufacturer: "Aegis", abbr: "JAVL", size: "capital", crew: { min: 12, max: 80 }, cargo: 5400, role: "Destroyer", flightReady: false },
      { name: "Nautilus", manufacturer: "Aegis", abbr: "NAUT", size: "capital", crew: { min: 5, max: 8 }, cargo: 0, role: "Minelayer", flightReady: false },
      { name: "890 Jump", manufacturer: "Origin", abbr: "890J", size: "capital", crew: { min: 3, max: 5 }, cargo: 48, role: "Luxury Touring", flightReady: true },
      { name: "Kraken", manufacturer: "Drake", abbr: "KRKN", size: "capital", crew: { min: 10, max: 20 }, cargo: 3462, role: "Carrier", flightReady: false },
    ],
  },
  {
    id: "cargo",
    label: "Cargo / Transport",
    color: "#F0A500",
    ships: [
      { name: "C2 Hercules", manufacturer: "Crusader", abbr: "C2", size: "xl", crew: { min: 2, max: 3 }, cargo: 696, role: "Heavy Freighter", flightReady: true },
      { name: "M2 Hercules", manufacturer: "Crusader", abbr: "M2", size: "xl", crew: { min: 2, max: 4 }, cargo: 522, role: "Military Freighter", flightReady: true },
      { name: "Caterpillar", manufacturer: "Drake", abbr: "CAT", size: "l", crew: { min: 1, max: 5 }, cargo: 576, role: "Modular Freighter", flightReady: true },
      { name: "Hull C", manufacturer: "MISC", abbr: "HULC", size: "l", crew: { min: 1, max: 4 }, cargo: 4608, role: "Bulk Freighter", flightReady: true },
      { name: "RAFT", manufacturer: "MISC", abbr: "RAFT", size: "m", crew: { min: 1, max: 1 }, cargo: 96, role: "Cargo Hauler", flightReady: true },
      { name: "Freelancer MAX", manufacturer: "MISC", abbr: "FL-X", size: "m", crew: { min: 1, max: 4 }, cargo: 120, role: "Light Freighter", flightReady: true },
      { name: "Constellation Taurus", manufacturer: "RSI", abbr: "TAUR", size: "l", crew: { min: 1, max: 3 }, cargo: 174, role: "Heavy Hauler", flightReady: true },
      { name: "Zeus MR", manufacturer: "RSI", abbr: "ZEUS", size: "m", crew: { min: 1, max: 2 }, cargo: 40, role: "Medium Freight", flightReady: false },
      { name: "Hull A", manufacturer: "MISC", abbr: "HULA", size: "s", crew: { min: 1, max: 1 }, cargo: 64, role: "Light Freighter", flightReady: true },
      { name: "Hull B", manufacturer: "MISC", abbr: "HULB", size: "m", crew: { min: 1, max: 2 }, cargo: 384, role: "Medium Freighter", flightReady: false },
    ],
  },
  {
    id: "mining",
    label: "Mining / Salvage",
    color: "#C4724B",
    ships: [
      { name: "Prospector", manufacturer: "MISC", abbr: "PRSP", size: "s", crew: { min: 1, max: 1 }, cargo: 32, role: "Mining Ship", flightReady: true },
      { name: "MOLE", manufacturer: "ARGO", abbr: "MOLE", size: "m", crew: { min: 1, max: 4 }, cargo: 96, role: "Multicrew Mining", flightReady: true },
      { name: "Orion", manufacturer: "RSI", abbr: "ORIN", size: "capital", crew: { min: 4, max: 7 }, cargo: 384, role: "Industrial Mining", flightReady: false },
      { name: "Vulture", manufacturer: "Drake", abbr: "VULT", size: "s", crew: { min: 1, max: 1 }, cargo: 12, role: "Light Salvage", flightReady: true },
      { name: "Reclaimer", manufacturer: "Aegis", abbr: "RCLM", size: "xl", crew: { min: 1, max: 5 }, cargo: 450, role: "Heavy Salvage", flightReady: true },
    ],
  },
  {
    id: "support",
    label: "Support / Utility",
    color: "#00ffcc",
    ships: [
      { name: "Carrack", manufacturer: "Anvil", abbr: "CRRK", size: "l", crew: { min: 2, max: 6 }, cargo: 456, role: "Exploration / Pathfinder", flightReady: true },
      { name: "Terrapin", manufacturer: "Anvil", abbr: "TERP", size: "s", crew: { min: 1, max: 2 }, cargo: 0, role: "Recon / Scanner", flightReady: true },
      { name: "Herald", manufacturer: "Drake", abbr: "HRLD", size: "s", crew: { min: 1, max: 1 }, cargo: 0, role: "Data Runner", flightReady: true },
      { name: "Cutlass Red", manufacturer: "Drake", abbr: "CUT-R", size: "m", crew: { min: 1, max: 3 }, cargo: 12, role: "Search & Rescue", flightReady: true },
      { name: "Apollo Medivac", manufacturer: "RSI", abbr: "APOL", size: "m", crew: { min: 1, max: 3 }, cargo: 28, role: "Medical Ship", flightReady: false },
      { name: "Starfarer", manufacturer: "MISC", abbr: "STRF", size: "l", crew: { min: 2, max: 7 }, cargo: 291, role: "Fuel Tanker", flightReady: true },
      { name: "Vulcan", manufacturer: "Aegis", abbr: "VLCN", size: "m", crew: { min: 1, max: 3 }, cargo: 12, role: "Repair / Refuel", flightReady: false },
      { name: "Pisces", manufacturer: "Anvil", abbr: "PISC", size: "xs", crew: { min: 1, max: 3 }, cargo: 4, role: "Utility Snub", flightReady: true },
      { name: "Mercury Star Runner", manufacturer: "Crusader", abbr: "MSR", size: "l", crew: { min: 1, max: 3 }, cargo: 96, role: "Data Runner / Smuggler", flightReady: true },
      { name: "Endeavor", manufacturer: "MISC", abbr: "ENDV", size: "capital", crew: { min: 4, max: 16 }, cargo: 500, role: "Science / Research", flightReady: false },
      { name: "SRV", manufacturer: "Argo", abbr: "SRV", size: "s", crew: { min: 1, max: 2 }, cargo: 0, role: "Tug / Towing", flightReady: true },
    ],
  },
  {
    id: "ground",
    label: "Ground Vehicles",
    color: "#556B2F",
    ships: [
      { name: "Nova Tonk", manufacturer: "Tumbril", abbr: "TONK", size: "m", crew: { min: 1, max: 3 }, cargo: 0, role: "Main Battle Tank", flightReady: true },
      { name: "Ballista", manufacturer: "Anvil", abbr: "BLST", size: "m", crew: { min: 1, max: 3 }, cargo: 0, role: "AA/AT Launcher", flightReady: true },
      { name: "Centurion", manufacturer: "Tumbril", abbr: "CENT", size: "s", crew: { min: 1, max: 2 }, cargo: 0, role: "IFV", flightReady: true },
      { name: "Ursa Rover", manufacturer: "RSI", abbr: "URSA", size: "s", crew: { min: 1, max: 4 }, cargo: 4, role: "Exploration Rover", flightReady: true },
      { name: "ROC", manufacturer: "Greycat", abbr: "ROC", size: "xs", crew: { min: 1, max: 1 }, cargo: 0, role: "Mining Vehicle", flightReady: true },
      { name: "PTV", manufacturer: "Greycat", abbr: "PTV", size: "xs", crew: { min: 1, max: 2 }, cargo: 0, role: "Transport Buggy", flightReady: true },
      { name: "Spartan", manufacturer: "Tumbril", abbr: "SPRT", size: "s", crew: { min: 1, max: 4 }, cargo: 4, role: "APC", flightReady: true },
      { name: "Storm AA", manufacturer: "Tumbril", abbr: "STAA", size: "m", crew: { min: 1, max: 2 }, cargo: 0, role: "AA Platform", flightReady: false },
    ],
  },
];

/** Flat list of all ships for search */
export const ALL_SHIPS: ShipEntry[] = SC_SHIP_CATEGORIES.flatMap(
  (cat) => cat.ships
);

/** Look up a ship entry by name (case-insensitive) */
export function findShip(name: string): ShipEntry | undefined {
  const lower = name.toLowerCase().trim();
  return ALL_SHIPS.find((s) => s.name.toLowerCase() === lower);
}

/** Get the category for a ship name */
export function getShipCategory(name: string): ShipCategory | undefined {
  const lower = name.toLowerCase().trim();
  return SC_SHIP_CATEGORIES.find((cat) =>
    cat.ships.some((s) => s.name.toLowerCase() === lower || s.abbr.toLowerCase() === lower)
  );
}

/** Size labels for display */
export const SHIP_SIZE_LABELS: Record<string, string> = {
  xs: "XS (Snub)",
  s: "Small",
  m: "Medium",
  l: "Large",
  xl: "Extra Large",
  capital: "Capital",
};
