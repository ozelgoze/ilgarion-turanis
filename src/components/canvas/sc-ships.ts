/**
 * Star Citizen ship database for marker assignment.
 * Organized by role category for quick selection.
 */

export interface ShipEntry {
  name: string;
  manufacturer: string;
  /** Short 3-4 char abbreviation for tight label display */
  abbr: string;
}

export interface ShipCategory {
  id: string;
  label: string;
  ships: ShipEntry[];
}

export const SC_SHIP_CATEGORIES: ShipCategory[] = [
  {
    id: "fighter",
    label: "Fighters",
    ships: [
      { name: "Gladius", manufacturer: "Aegis", abbr: "GLAD" },
      { name: "Arrow", manufacturer: "Anvil", abbr: "ARRW" },
      { name: "Sabre", manufacturer: "Aegis", abbr: "SABR" },
      { name: "Hornet F7C", manufacturer: "Anvil", abbr: "F7C" },
      { name: "Hornet F7A", manufacturer: "Anvil", abbr: "F7A" },
      { name: "Buccaneer", manufacturer: "Drake", abbr: "BUCK" },
      { name: "Blade", manufacturer: "Esperia", abbr: "BLDE" },
      { name: "Talon", manufacturer: "Esperia", abbr: "TLON" },
      { name: "Scorpius", manufacturer: "RSI", abbr: "SCOR" },
    ],
  },
  {
    id: "heavy_fighter",
    label: "Heavy Fighters",
    ships: [
      { name: "Vanguard Warden", manufacturer: "Aegis", abbr: "VG-W" },
      { name: "Vanguard Sentinel", manufacturer: "Aegis", abbr: "VG-S" },
      { name: "Vanguard Harbinger", manufacturer: "Aegis", abbr: "VG-H" },
      { name: "Hurricane", manufacturer: "Anvil", abbr: "HURR" },
      { name: "Ares Inferno", manufacturer: "Crusader", abbr: "INRN" },
      { name: "Ares Ion", manufacturer: "Crusader", abbr: "ION" },
    ],
  },
  {
    id: "bomber",
    label: "Bombers / Torpedo",
    ships: [
      { name: "Eclipse", manufacturer: "Aegis", abbr: "ECLP" },
      { name: "Retaliator", manufacturer: "Aegis", abbr: "RETA" },
      { name: "A2 Hercules", manufacturer: "Crusader", abbr: "A2" },
      { name: "Gladiator", manufacturer: "Anvil", abbr: "GLDT" },
    ],
  },
  {
    id: "multicrew",
    label: "Multicrew / Gunships",
    ships: [
      { name: "Cutlass Black", manufacturer: "Drake", abbr: "CUT-B" },
      { name: "Cutlass Blue", manufacturer: "Drake", abbr: "CUT-L" },
      { name: "Freelancer MIS", manufacturer: "MISC", abbr: "FL-M" },
      { name: "Constellation Andromeda", manufacturer: "RSI", abbr: "ANDRO" },
      { name: "Constellation Aquila", manufacturer: "RSI", abbr: "AQULA" },
      { name: "Redeemer", manufacturer: "Aegis", abbr: "REDM" },
      { name: "Corsair", manufacturer: "Drake", abbr: "CORS" },
    ],
  },
  {
    id: "capital",
    label: "Capital Ships",
    ships: [
      { name: "Hammerhead", manufacturer: "Aegis", abbr: "HH" },
      { name: "Polaris", manufacturer: "RSI", abbr: "POLR" },
      { name: "Perseus", manufacturer: "RSI", abbr: "PERS" },
      { name: "Idris-M", manufacturer: "Aegis", abbr: "IDRS" },
      { name: "Javelin", manufacturer: "Aegis", abbr: "JAVL" },
      { name: "Nautilus", manufacturer: "Aegis", abbr: "NAUT" },
      { name: "890 Jump", manufacturer: "Origin", abbr: "890J" },
    ],
  },
  {
    id: "cargo",
    label: "Cargo / Transport",
    ships: [
      { name: "C2 Hercules", manufacturer: "Crusader", abbr: "C2" },
      { name: "M2 Hercules", manufacturer: "Crusader", abbr: "M2" },
      { name: "Caterpillar", manufacturer: "Drake", abbr: "CAT" },
      { name: "Hull C", manufacturer: "MISC", abbr: "HULC" },
      { name: "RAFT", manufacturer: "MISC", abbr: "RAFT" },
      { name: "Freelancer MAX", manufacturer: "MISC", abbr: "FL-X" },
      { name: "Constellation Taurus", manufacturer: "RSI", abbr: "TAUR" },
    ],
  },
  {
    id: "mining",
    label: "Mining / Salvage",
    ships: [
      { name: "Prospector", manufacturer: "MISC", abbr: "PRSP" },
      { name: "MOLE", manufacturer: "ARGO", abbr: "MOLE" },
      { name: "Orion", manufacturer: "RSI", abbr: "ORIN" },
      { name: "Vulture", manufacturer: "Drake", abbr: "VULT" },
      { name: "Reclaimer", manufacturer: "Aegis", abbr: "RCLM" },
    ],
  },
  {
    id: "support",
    label: "Support / Utility",
    ships: [
      { name: "Carrack", manufacturer: "Anvil", abbr: "CRRK" },
      { name: "Terrapin", manufacturer: "Anvil", abbr: "TERP" },
      { name: "Herald", manufacturer: "Drake", abbr: "HRLD" },
      { name: "Cutlass Red", manufacturer: "Drake", abbr: "CUT-R" },
      { name: "Apollo Medivac", manufacturer: "RSI", abbr: "APOL" },
      { name: "Starfarer", manufacturer: "MISC", abbr: "STRF" },
      { name: "Vulcan", manufacturer: "Aegis", abbr: "VLCN" },
      { name: "Pisces", manufacturer: "Anvil", abbr: "PISC" },
      { name: "Mercury Star Runner", manufacturer: "Crusader", abbr: "MSR" },
    ],
  },
  {
    id: "ground",
    label: "Ground Vehicles",
    ships: [
      { name: "Nova Tonk", manufacturer: "Tumbril", abbr: "TONK" },
      { name: "Ballista", manufacturer: "Anvil", abbr: "BLST" },
      { name: "Centurion", manufacturer: "Tumbril", abbr: "CENT" },
      { name: "Ursa Rover", manufacturer: "RSI", abbr: "URSA" },
      { name: "ROC", manufacturer: "Greycat", abbr: "ROC" },
      { name: "PTV", manufacturer: "Greycat", abbr: "PTV" },
      { name: "Spartan", manufacturer: "Tumbril", abbr: "SPRT" },
    ],
  },
];

/** Flat list of all ships for search */
export const ALL_SHIPS: ShipEntry[] = SC_SHIP_CATEGORIES.flatMap(
  (cat) => cat.ships
);
