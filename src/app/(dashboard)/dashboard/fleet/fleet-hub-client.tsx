"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import PageTransition from "@/components/page-transition";
import type { HangarShip } from "@/types/database";
import {
  SC_SHIP_CATEGORIES,
  ALL_SHIPS,
  findShip,
  getShipCategory,
  SHIP_SIZE_LABELS,
  type ShipEntry,
} from "@/components/canvas/sc-ships";
import {
  addShipToHangar,
  updateHangarShip,
  removeShipFromHangar,
  setPrimaryShip,
} from "@/app/actions/hangar";

// ── Tab types ───────────────────────────────────────────────────────────────

type Tab = "hangar" | "browser";

const INSURANCE_OPTIONS = ["LTI", "10Y", "6M", "3M", "IAE", "Other"];

// ── Fleet Hub Client ────────────────────────────────────────────────────────

interface FleetHubClientProps {
  hangar: HangarShip[];
}

export default function FleetHubClient({ hangar: initialHangar }: FleetHubClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hangar");
  const [hangar, setHangar] = useState(initialHangar);

  // ── Browser state ──
  const [browserSearch, setBrowserSearch] = useState("");
  const [browserCategory, setBrowserCategory] = useState<string>("");
  const [browserSize, setBrowserSize] = useState<string>("");

  // ── Add ship modal ──
  const [addingShip, setAddingShip] = useState<ShipEntry | null>(null);
  const [addNickname, setAddNickname] = useState("");
  const [addErkul, setAddErkul] = useState("");
  const [addInsurance, setAddInsurance] = useState("");
  const [addPrimary, setAddPrimary] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  // ── Edit ship modal ──
  const [editingShip, setEditingShip] = useState<HangarShip | null>(null);
  const [editNickname, setEditNickname] = useState("");
  const [editErkul, setEditErkul] = useState("");
  const [editInsurance, setEditInsurance] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  // ── Hangar set names ──
  const hangarShipNames = useMemo(
    () => new Set(hangar.map((h) => h.ship_name.toLowerCase())),
    [hangar]
  );

  // ── Filtered browser ships ──
  const filteredBrowserShips = useMemo(() => {
    return SC_SHIP_CATEGORIES.map((cat) => ({
      ...cat,
      ships: cat.ships.filter((ship) => {
        if (browserCategory && cat.id !== browserCategory) return false;
        if (browserSize && ship.size !== browserSize) return false;
        if (browserSearch) {
          const q = browserSearch.toLowerCase();
          return (
            ship.name.toLowerCase().includes(q) ||
            ship.manufacturer.toLowerCase().includes(q) ||
            ship.role.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    })).filter((cat) => cat.ships.length > 0);
  }, [browserSearch, browserCategory, browserSize]);

  // ── Hangar stats ──
  const hangarStats = useMemo(() => {
    let totalCrew = 0;
    let totalCargo = 0;
    const categories = new Map<string, number>();

    for (const h of hangar) {
      const ship = findShip(h.ship_name);
      if (ship) {
        totalCrew += ship.crew.max;
        totalCargo += ship.cargo;
        const cat = getShipCategory(h.ship_name);
        if (cat) categories.set(cat.label, (categories.get(cat.label) ?? 0) + 1);
      }
    }

    return {
      totalShips: hangar.length,
      totalCrew,
      totalCargo,
      categories: Array.from(categories.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [hangar]);

  // ── Actions ───────────────────────────────────────────────

  async function handleAddShip() {
    if (!addingShip) return;
    setAddSubmitting(true);
    setAddError("");

    const result = await addShipToHangar({
      ship_name: addingShip.name,
      nickname: addNickname || undefined,
      erkul_link: addErkul || undefined,
      insurance: addInsurance || undefined,
      is_primary: addPrimary,
    });

    setAddSubmitting(false);
    if (result.error) {
      setAddError(result.error);
    } else {
      setAddingShip(null);
      setAddNickname("");
      setAddErkul("");
      setAddInsurance("");
      setAddPrimary(false);
      router.refresh();
      // Optimistic: add to local state
      if (result.ship) setHangar((prev) => [...prev, result.ship!]);
    }
  }

  async function handleEditShip() {
    if (!editingShip) return;
    setEditSubmitting(true);
    await updateHangarShip(editingShip.id, {
      nickname: editNickname || null,
      erkul_link: editErkul || null,
      insurance: editInsurance || null,
      notes: editNotes || null,
    });
    setEditSubmitting(false);
    setEditingShip(null);
    router.refresh();
    setHangar((prev) =>
      prev.map((h) =>
        h.id === editingShip.id
          ? { ...h, nickname: editNickname || null, erkul_link: editErkul || null, insurance: editInsurance || null, notes: editNotes || null }
          : h
      )
    );
  }

  async function handleSetPrimary(id: string) {
    await setPrimaryShip(id);
    setHangar((prev) =>
      prev.map((h) => ({ ...h, is_primary: h.id === id }))
    );
    router.refresh();
  }

  async function handleRemoveShip(id: string, name: string) {
    if (!confirm(`Remove ${name} from your hangar?`)) return;
    await removeShipFromHangar(id);
    setHangar((prev) => prev.filter((h) => h.id !== id));
    router.refresh();
  }

  function openEdit(ship: HangarShip) {
    setEditingShip(ship);
    setEditNickname(ship.nickname ?? "");
    setEditErkul(ship.erkul_link ?? "");
    setEditInsurance(ship.insurance ?? "");
    setEditNotes(ship.notes ?? "");
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <PageTransition className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="font-mono text-[10px] tracking-widest text-text-muted hover:text-text-dim uppercase transition-colors">
          OPS CENTER
        </Link>
        <span className="font-mono text-[10px] text-border">&rsaquo;</span>
        <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
          Fleet Hub
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-6 bg-amber" />
            <h1 className="font-mono font-bold text-text-bright text-lg tracking-wide uppercase">
              Fleet Hub
            </h1>
          </div>
          <p className="font-mono text-[10px] text-text-muted tracking-widest ml-4">
            Manage your ship hangar, browse the fleet database, and configure loadouts.
          </p>
        </div>

        {/* Erkul quick access */}
        <a
          href="https://www.erkul.games/live/calculator"
          target="_blank"
          rel="noopener noreferrer"
          className="mtc-btn-ghost text-[10px] flex items-center gap-2 shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          ERKUL.GAMES
        </a>
      </div>

      {/* Fleet Stats Bar */}
      {hangar.length > 0 && (
        <div className="mtc-panel bg-bg-surface p-4 mb-6 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">Ships:</span>
            <span className="font-mono text-sm text-amber font-bold">{hangarStats.totalShips}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">Max Crew:</span>
            <span className="font-mono text-sm text-text-bright font-bold">{hangarStats.totalCrew}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-widest text-text-muted uppercase">Cargo:</span>
            <span className="font-mono text-sm text-text-bright font-bold">{hangarStats.totalCargo.toLocaleString()} SCU</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 flex-wrap">
            {hangarStats.categories.map(([catName, count]) => {
              const cat = SC_SHIP_CATEGORIES.find((c) => c.label === catName);
              return (
                <span key={catName} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5" style={{ backgroundColor: cat?.color ?? "#666" }} />
                  <span className="font-mono text-[8px] tracking-widest text-text-muted uppercase">
                    {catName}: {count}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {[
          { key: "hangar" as Tab, label: "MY HANGAR", count: hangar.length },
          { key: "browser" as Tab, label: "SHIP BROWSER", count: ALL_SHIPS.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "px-4 py-2.5 font-mono text-[10px] tracking-widest uppercase transition-colors border-b-2 -mb-px",
              tab === t.key
                ? "text-amber border-amber"
                : "text-text-muted border-transparent hover:text-text-dim",
            ].join(" ")}
          >
            {t.label} [{t.count}]
          </button>
        ))}
      </div>

      {/* ────────── MY HANGAR TAB ────────── */}
      {tab === "hangar" && (
        <div>
          {hangar.length === 0 ? (
            <div className="mtc-panel bg-bg-surface p-12 text-center">
              <div className="mb-4 flex justify-center">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber/20">
                  <path d="M12 2 L4 9 L4 16 L12 22 L20 16 L20 9 Z" />
                  <line x1="12" y1="2" x2="12" y2="22" />
                </svg>
              </div>
              <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase mb-2">Hangar Empty</p>
              <p className="font-mono text-[10px] text-text-muted tracking-widest mb-4">
                Add ships from the Ship Browser to build your fleet.
              </p>
              <button onClick={() => setTab("browser")} className="mtc-btn-primary text-sm">
                BROWSE SHIPS
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hangar.map((h) => {
                const shipData = findShip(h.ship_name);
                const cat = getShipCategory(h.ship_name);
                return (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mtc-panel bg-bg-surface p-5 transition-all hover:bg-bg-elevated ${h.is_primary ? "border-amber/40" : ""}`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2" style={{ backgroundColor: cat?.color ?? "#666" }} />
                        <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: cat?.color ?? "#666" }}>
                          {cat?.label ?? "Unknown"}
                        </span>
                      </div>
                      {h.is_primary && (
                        <span className="font-mono text-[8px] tracking-widest text-amber uppercase px-1.5 py-0.5 border border-amber/30 bg-amber/10">
                          MAIN SHIP
                        </span>
                      )}
                    </div>

                    {/* Ship name */}
                    <h3 className="font-mono font-bold text-text-bright text-sm tracking-wide mb-1">
                      {h.ship_name}
                    </h3>
                    {h.nickname && (
                      <p className="font-mono text-[10px] text-amber/70 tracking-widest italic mb-2">
                        &ldquo;{h.nickname}&rdquo;
                      </p>
                    )}

                    {/* Specs */}
                    {shipData && (
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="font-mono text-[8px] text-text-muted tracking-widest">{shipData.manufacturer}</span>
                        <span className="font-mono text-[8px] text-text-muted tracking-widest">{SHIP_SIZE_LABELS[shipData.size]}</span>
                        <span className="font-mono text-[8px] text-text-muted tracking-widest">CREW {shipData.crew.min}-{shipData.crew.max}</span>
                        {shipData.cargo > 0 && (
                          <span className="font-mono text-[8px] text-text-muted tracking-widest">{shipData.cargo} SCU</span>
                        )}
                      </div>
                    )}

                    {/* Insurance & erkul */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {h.insurance && (
                        <span className="font-mono text-[8px] tracking-widest text-accent/60 uppercase border border-accent/20 px-1 py-0.5">
                          {h.insurance}
                        </span>
                      )}
                      {h.erkul_link && (
                        <a
                          href={h.erkul_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[8px] tracking-widest text-amber hover:text-amber/80 uppercase transition-colors flex items-center gap-1"
                        >
                          LOADOUT ↗
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        {!h.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(h.id)}
                            className="font-mono text-[9px] tracking-widest text-text-muted hover:text-amber uppercase transition-colors"
                          >
                            SET MAIN
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(h)}
                          className="font-mono text-[9px] tracking-widest text-text-muted hover:text-accent uppercase transition-colors"
                        >
                          EDIT
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveShip(h.id, h.ship_name)}
                        className="font-mono text-[9px] tracking-widest text-text-muted hover:text-danger uppercase transition-colors"
                      >
                        REMOVE
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {hangar.length > 0 && (
            <div className="mt-4 text-center">
              <button onClick={() => setTab("browser")} className="mtc-btn-ghost text-[10px]">
                + ADD MORE SHIPS
              </button>
            </div>
          )}
        </div>
      )}

      {/* ────────── SHIP BROWSER TAB ────────── */}
      {tab === "browser" && (
        <div>
          {/* Search & filters */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <input
              type="text"
              value={browserSearch}
              onChange={(e) => setBrowserSearch(e.target.value)}
              placeholder="Search ships..."
              className="mtc-input font-mono text-[11px] flex-1 min-w-[200px]"
            />
            <select
              value={browserCategory}
              onChange={(e) => setBrowserCategory(e.target.value)}
              className="mtc-input font-mono text-[10px] w-40"
            >
              <option value="">All Categories</option>
              {SC_SHIP_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <select
              value={browserSize}
              onChange={(e) => setBrowserSize(e.target.value)}
              className="mtc-input font-mono text-[10px] w-32"
            >
              <option value="">All Sizes</option>
              {Object.entries(SHIP_SIZE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Ship grid by category */}
          {filteredBrowserShips.length === 0 ? (
            <div className="mtc-panel bg-bg-surface p-10 text-center">
              <p className="font-mono text-sm tracking-[0.2em] text-text-dim uppercase">No ships match your search</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredBrowserShips.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2" style={{ backgroundColor: cat.color }} />
                    <h3 className="font-mono text-xs tracking-[0.2em] text-text-dim uppercase">{cat.label}</h3>
                    <span className="font-mono text-[9px] text-text-muted">[{cat.ships.length}]</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cat.ships.map((ship) => {
                      const inHangar = hangarShipNames.has(ship.name.toLowerCase());
                      return (
                        <div
                          key={ship.name}
                          className={`mtc-panel bg-bg-surface p-4 transition-all hover:bg-bg-elevated ${inHangar ? "border-accent/30" : ""}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-mono font-bold text-text-bright text-[12px] tracking-wide">{ship.name}</h4>
                              <p className="font-mono text-[9px] text-text-muted tracking-widest">{ship.manufacturer} · {ship.role}</p>
                            </div>
                            {!ship.flightReady && (
                              <span className="font-mono text-[7px] text-amber/60 tracking-widest uppercase border border-amber/20 px-1 py-0.5">
                                CONCEPT
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <span className="font-mono text-[8px] text-text-muted tracking-widest">{SHIP_SIZE_LABELS[ship.size]}</span>
                            <span className="font-mono text-[8px] text-text-muted tracking-widest">CREW {ship.crew.min}-{ship.crew.max}</span>
                            {ship.cargo > 0 && (
                              <span className="font-mono text-[8px] text-text-muted tracking-widest">{ship.cargo} SCU</span>
                            )}
                          </div>

                          {inHangar ? (
                            <span className="font-mono text-[9px] tracking-widest text-accent uppercase">✓ IN HANGAR</span>
                          ) : (
                            <button
                              onClick={() => {
                                setAddingShip(ship);
                                setAddNickname("");
                                setAddErkul("");
                                setAddInsurance("");
                                setAddPrimary(hangar.length === 0);
                                setAddError("");
                              }}
                              className="mtc-btn-primary text-[9px] px-3 py-1"
                            >
                              + ADD TO HANGAR
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────── ADD SHIP MODAL ────────── */}
      <AnimatePresence>
        {addingShip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setAddingShip(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="mtc-panel bg-bg-surface p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-mono font-bold text-text-bright text-sm tracking-wide mb-1">
                Add {addingShip.name}
              </h3>
              <p className="font-mono text-[9px] text-text-muted tracking-widest mb-4">
                {addingShip.manufacturer} · {addingShip.role}
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-mono text-[9px] tracking-widest text-text-dim uppercase">Nickname (optional)</label>
                  <input
                    type="text"
                    value={addNickname}
                    onChange={(e) => setAddNickname(e.target.value)}
                    placeholder='e.g. "The Brick"'
                    className="mtc-input font-mono text-[11px] w-full"
                    maxLength={40}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] tracking-widest text-text-dim uppercase">
                    Erkul.games Loadout URL (optional)
                  </label>
                  <input
                    type="url"
                    value={addErkul}
                    onChange={(e) => setAddErkul(e.target.value)}
                    placeholder="https://www.erkul.games/live/calculator/..."
                    className="mtc-input font-mono text-[11px] w-full"
                  />
                  <p className="font-mono text-[8px] text-text-muted/60 tracking-widest">
                    Paste your loadout URL from erkul.games DPS Calculator
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] tracking-widest text-text-dim uppercase">Insurance</label>
                    <select
                      value={addInsurance}
                      onChange={(e) => setAddInsurance(e.target.value)}
                      className="mtc-input font-mono text-[10px] w-full"
                    >
                      <option value="">None</option>
                      {INSURANCE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addPrimary}
                        onChange={(e) => setAddPrimary(e.target.checked)}
                        className="accent-amber"
                      />
                      <span className="font-mono text-[9px] tracking-widest text-text-dim uppercase">
                        Set as Main Ship
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {addError && (
                <div className="mt-3 border border-danger/30 bg-danger/5 px-3 py-2">
                  <p className="font-mono text-[10px] text-danger tracking-widest">⚠ {addError}</p>
                </div>
              )}

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleAddShip}
                  disabled={addSubmitting}
                  className="mtc-btn-primary flex-1"
                >
                  {addSubmitting ? "ADDING..." : "ADD TO HANGAR"}
                </button>
                <button onClick={() => setAddingShip(null)} className="mtc-btn-ghost">
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────────── EDIT SHIP MODAL ────────── */}
      <AnimatePresence>
        {editingShip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setEditingShip(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="mtc-panel bg-bg-surface p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-mono font-bold text-text-bright text-sm tracking-wide mb-4">
                Edit {editingShip.ship_name}
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-mono text-[9px] tracking-widest text-text-dim uppercase">Nickname</label>
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    placeholder="Optional nickname"
                    className="mtc-input font-mono text-[11px] w-full"
                    maxLength={40}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] tracking-widest text-text-dim uppercase">
                    Erkul.games Loadout URL
                  </label>
                  <input
                    type="url"
                    value={editErkul}
                    onChange={(e) => setEditErkul(e.target.value)}
                    placeholder="https://www.erkul.games/live/calculator/..."
                    className="mtc-input font-mono text-[11px] w-full"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] tracking-widest text-text-dim uppercase">Insurance</label>
                  <select
                    value={editInsurance}
                    onChange={(e) => setEditInsurance(e.target.value)}
                    className="mtc-input font-mono text-[10px] w-full"
                  >
                    <option value="">None</option>
                    {INSURANCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] tracking-widest text-text-dim uppercase">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Personal notes..."
                    rows={2}
                    className="mtc-input font-mono text-[11px] w-full resize-none"
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleEditShip}
                  disabled={editSubmitting}
                  className="mtc-btn-primary flex-1"
                >
                  {editSubmitting ? "SAVING..." : "SAVE CHANGES"}
                </button>
                <button onClick={() => setEditingShip(null)} className="mtc-btn-ghost">
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
