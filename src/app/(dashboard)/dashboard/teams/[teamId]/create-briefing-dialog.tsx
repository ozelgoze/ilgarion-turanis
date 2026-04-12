"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { createBriefing } from "@/app/actions/briefings";

interface CreateBriefingDialogProps {
  teamId: string;
}

// ── SC Operation Templates ──────────────────────────────────────────────────

interface OpTemplate {
  id: string;
  name: string;
  icon: string;
  defaultTitle: string;
  content: string;
}

const OP_TEMPLATES: OpTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    icon: "□",
    defaultTitle: "",
    content: "",
  },
  {
    id: "cargo_run",
    name: "Cargo Run",
    icon: "⊞",
    defaultTitle: "OP — CARGO RUN",
    content: `# MISSION BRIEFING — CARGO RUN

## SITUATION
- Commodity: [e.g. Laranite, Agricium, Medical Supplies]
- Route: [Origin] → [Destination]
- Threat Level: [LOW / MEDIUM / HIGH]
- Expected hostile presence: [None / Pirate NPC / Player interdiction risk]

## FLEET COMPOSITION
- Cargo vessels: [e.g. 2x C2 Hercules, 1x Caterpillar]
- Escort fighters: [e.g. 2x Vanguard Sentinel, 1x Eclipse]
- Pathfinder: [e.g. 1x Terrapin]

## EXECUTION
1. Rally at [location] — all ships fueled and loaded
2. Pathfinder jumps ahead to scout route
3. Cargo convoy departs in formation
4. Escorts maintain perimeter — engage only on commander order
5. If interdicted: cargo vessels QT to fallback point [coords]
6. Deliver cargo, confirm payment, RTB

## COMMS
- Primary: [channel]
- Fallback: [channel]

## NOTES
- ROE: Defensive only unless commander authorizes
- Abort code: [codeword]`,
  },
  {
    id: "fleet_engagement",
    name: "Fleet Battle",
    icon: "◆",
    defaultTitle: "OP — FLEET ENGAGEMENT",
    content: `# MISSION BRIEFING — FLEET ENGAGEMENT

## SITUATION
- Target: [Org name / NPC faction / Location]
- Intel: [Known ship composition, numbers, location]
- Objective: [Destroy / Disable / Escort / Area denial]
- Threat Level: HIGH

## ORDER OF BATTLE
### Alpha Wing (Assault)
- [Ship 1] — [Pilot callsign]
- [Ship 2] — [Pilot callsign]

### Bravo Wing (Support)
- [Ship 1] — [Pilot callsign]
- [Ship 2] — [Pilot callsign]

### Charlie (Capital/Command)
- [Flagship] — [Commander callsign]

## PHASE 1 — APPROACH
- Form up at [rally point]
- QT to [staging area] in staggered jumps
- Scouts confirm target position

## PHASE 2 — ENGAGEMENT
- Alpha Wing initiates — focus fire on [priority target]
- Bravo Wing flanks from [direction]
- Capital ships hold at [range] and provide fire support
- Medical on standby at [safe point]

## PHASE 3 — EXTRACTION
- Disengage signal: [codeword]
- Fallback point: [coords]
- SAR for downed pilots

## COMMS & ROE
- Command channel: [channel]
- Wing channels: [alpha/bravo/charlie]
- ROE: Weapons free on confirmed hostiles
- Do NOT engage neutrals unless fired upon`,
  },
  {
    id: "ground_assault",
    name: "Ground Assault",
    icon: "✕",
    defaultTitle: "OP — GROUND ASSAULT",
    content: `# MISSION BRIEFING — GROUND ASSAULT

## SITUATION
- Location: [Planet / Moon / Outpost / Bunker]
- Objective: [Clear hostiles / Retrieve item / Secure area]
- Expected resistance: [Light / Moderate / Heavy]
- Environment: [Atmosphere? Gravity level? Weather?]

## TEAM COMPOSITION
### Insertion Team (FPS)
- Point: [Callsign] — [Loadout: SMG/Shotgun]
- Rifleman: [Callsign] — [Loadout: AR]
- Marksman: [Callsign] — [Loadout: Sniper]
- Medic: [Callsign] — [Loadout: Medgun + Pistol]

### Air Support
- [Ship] — [Pilot] — CAS on request
- [Ship] — [Pilot] — Overwatch / extraction

### Ground Vehicles
- [Vehicle] — [Driver] — [Role: transport / fire support]

## EXECUTION
1. Air transport to LZ [coords] — low approach
2. Dismount and secure perimeter
3. Advance to objective via [route]
4. Clear room by room / secure the area
5. Signal "OBJECTIVE COMPLETE" on command channel
6. Extract via [LZ / vehicle / QT]

## MEDICAL
- Field medic has priority on revives
- Respawn point: [ship medbay / station]
- If KIA: regroup at [location]

## LOADOUT NOTES
- Bring extra medpens and oxypen
- Heavy armor recommended for breach team
- Light armor for marksman (mobility)`,
  },
  {
    id: "mining_op",
    name: "Mining Op",
    icon: "⬡",
    defaultTitle: "OP — MINING OPERATION",
    content: `# MISSION BRIEFING — MINING OPERATION

## SITUATION
- Target resource: [Quantanium / Hadanite / Taranite / etc.]
- Location: [Planet / Moon / Belt]
- Duration: [Estimated time]
- Threat Level: [LOW / MEDIUM / HIGH]

## FLEET COMPOSITION
- Mining ships: [e.g. 2x MOLE, 1x Prospector]
- Cargo hauler: [e.g. 1x C2 Hercules for refined ore]
- Security escort: [e.g. 1x Vanguard, 1x Cutlass]
- Scout: [e.g. 1x Arrow — patrol perimeter]

## EXECUTION
1. Rally at [refinery / station]
2. Scout confirms mining site is clear
3. Mining ships begin extraction
4. Escorts patrol at [radius] — report contacts immediately
5. When full, cargo convoy to [refinery]
6. Submit refining jobs, secure payment

## SAFETY (QUANTANIUM SPECIFIC)
- **Timer starts on extraction** — move fast
- Do NOT exceed [X] SCU before hauling to refinery
- If overheating: jettison cargo, save the ship
- Keep escorts at safe distance during laser operation

## COMMS
- Mining channel: [channel]
- Security channel: [channel]
- Emergency: [channel]`,
  },
  {
    id: "bounty_hunt",
    name: "Bounty Hunt",
    icon: "◎",
    defaultTitle: "OP — BOUNTY HUNT",
    content: `# MISSION BRIEFING — BOUNTY HUNT

## TARGET
- Name / Org: [target identifier]
- Last known location: [system / area]
- Ship(s): [Known ship types]
- Threat assessment: [Solo / Group / Capital-class]
- Bounty value: [aUEC amount]

## HUNTER TEAM
- Lead: [Callsign] — [Ship]
- Wing: [Callsign] — [Ship]
- EWar/Disable: [Callsign] — [Ship with distortion / EMP]
- Backup: [Callsign] — [Ship]

## PLAN
1. Check last known markers / contract location
2. QT to area — spread formation, 10km spacing
3. Scanner sweep — locate target
4. Lead calls engagement — focus fire
5. If target runs: [pursuit protocol / cut off QT route]
6. Confirm kill, collect bounty, RTB

## RULES OF ENGAGEMENT
- Confirm target identity before engaging
- Check for crimestat — verify bounty is still active
- Do NOT engage bystanders
- If target surrenders: [accept / do not accept]

## CONTINGENCY
- If ambushed: scatter and regroup at [fallback point]
- If target has escort: disengage and reassess`,
  },
  {
    id: "recon",
    name: "Recon/Intel",
    icon: "◉",
    defaultTitle: "OP — RECONNAISSANCE",
    content: `# MISSION BRIEFING — RECONNAISSANCE

## OBJECTIVE
- Gather intel on [target / location / org activity]
- Do NOT engage unless compromised

## AREA OF OPERATIONS
- System: [Stanton / Pyro]
- Specific location: [Station / Moon / Area]
- Known hazards: [hostile presence / restricted area / environment]

## RECON TEAM
- Observer 1: [Callsign] — [Ship: Terrapin / Herald / DUR]
- Observer 2: [Callsign] — [Ship]
- QRF standby: [Callsign] — [Ship] (do not deploy unless called)

## COLLECTION PRIORITIES
1. Ship types and count at location
2. Org tags / player names if visible
3. Patrol routes and timing
4. Defensive positions / turret coverage
5. Entry/exit points for future ops

## EXECUTION
1. Approach from [direction] — engines low, avoid detection
2. Maintain [X] km observation distance
3. Record findings — screenshots / notes
4. Report to command on [channel] every [X] minutes
5. If detected: break contact, QT to [safe point]
6. Debrief at [location]

## COMMS
- Observation: [channel] — whisper protocol (text only if possible)
- Emergency: [channel]
- Report format: [CALLSIGN] [GRID] [OBSERVATION] [TIME]`,
  },
];

export default function CreateBriefingDialog({
  teamId,
}: CreateBriefingDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("blank");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function reset() {
    setTitle("");
    setEmbedUrl("");
    setSelectedTemplate("blank");
    setSubmitting(false);
    setError(null);
  }

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    const tpl = OP_TEMPLATES.find((t) => t.id === templateId);
    if (tpl && tpl.id !== "blank") {
      if (!title.trim()) setTitle(tpl.defaultTitle);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    const tpl = OP_TEMPLATES.find((t) => t.id === selectedTemplate);
    const content = tpl && tpl.id !== "blank" ? tpl.content : null;

    const result = await createBriefing({
      teamId,
      title: title.trim(),
      content,
      embedUrl: embedUrl.trim() || null,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setOpen(false);
    reset();
    if (result.briefing) {
      router.push(`/dashboard/briefings/${result.briefing.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button className="mtc-btn-primary text-sm">+ NEW BRIEFING</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onEscapeKeyDown={() => !submitting && setOpen(false)}
          onPointerDownOutside={() => !submitting && setOpen(false)}
        >
          <div className="mtc-panel bg-bg-surface p-8">
            {/* Header */}
            <div className="border-b border-border pb-4 mb-6 flex items-center justify-between">
              <Dialog.Title className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
                Create Briefing
              </Dialog.Title>
              <Dialog.Close
                disabled={submitting}
                className="font-mono text-[10px] text-text-muted hover:text-danger transition-colors disabled:opacity-40"
              >
                ✕ CLOSE
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Operation Template Selector */}
              <div className="space-y-2">
                <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
                  Operation Template
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {OP_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleTemplateSelect(tpl.id)}
                      className={[
                        "flex flex-col items-center gap-1 py-2 px-1 border font-mono text-center transition-all",
                        selectedTemplate === tpl.id
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-border text-text-muted hover:border-border-bright hover:text-text-dim",
                      ].join(" ")}
                    >
                      <span className="text-base leading-none">{tpl.icon}</span>
                      <span className="text-[7px] tracking-widest uppercase leading-tight">
                        {tpl.name}
                      </span>
                    </button>
                  ))}
                </div>
                {selectedTemplate !== "blank" && (
                  <p className="font-mono text-[9px] text-accent/70 tracking-widest">
                    Template will pre-fill SITREP notes with operation structure.
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
                  Briefing Title
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={128}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. OP THUNDERSTRIKE — PHASE 2"
                  className="mtc-input font-mono text-sm uppercase"
                  disabled={submitting}
                />
              </div>

              {/* Embed URL (optional) */}
              <div className="space-y-1">
                <label className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase">
                  Embed URL{" "}
                  <span className="text-text-muted">
                    (Google Docs / Slides — Optional)
                  </span>
                </label>
                <input
                  type="url"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  placeholder="https://docs.google.com/presentation/d/..."
                  className="mtc-input font-mono text-[11px]"
                  disabled={submitting}
                />
                <p className="font-mono text-[9px] text-text-muted tracking-widest">
                  Paste a published Google Docs, Slides, or other embeddable URL.
                  You can also add this later.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="border border-danger/30 bg-danger/5 px-3 py-2">
                  <p className="font-mono text-[11px] text-danger tracking-widest">
                    ⚠ {error}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="mtc-btn-primary"
                >
                  {submitting ? "CREATING..." : "CREATE BRIEFING"}
                </button>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    disabled={submitting}
                    className="mtc-btn-ghost"
                  >
                    CANCEL
                  </button>
                </Dialog.Close>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
