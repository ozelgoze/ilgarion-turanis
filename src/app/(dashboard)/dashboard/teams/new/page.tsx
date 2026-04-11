"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createTeamAction, type TeamActionResult } from "@/app/actions/teams";

const initialState: TeamActionResult = {};

export default function NewTeamPage() {
  const [state, formAction, isPending] = useActionState(
    createTeamAction,
    initialState
  );

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6">
        <Link
          href="/dashboard"
          className="font-mono text-[10px] tracking-widest text-text-muted hover:text-text-dim uppercase transition-colors"
        >
          OPS CENTER
        </Link>
        <span className="font-mono text-[10px] text-border">›</span>
        <span className="font-mono text-[10px] tracking-widest text-text-dim uppercase">
          Register Unit
        </span>
      </nav>

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-amber" />
        <h1 className="font-mono text-xs tracking-[0.3em] text-text-dim uppercase">
          Register New Unit
        </h1>
      </div>

      {/* Form Panel */}
      <div className="mtc-panel bg-bg-surface p-8">
        <div className="border-b border-border pb-4 mb-6 flex items-center justify-between">
          <span className="font-mono text-xs tracking-[0.2em] text-amber uppercase">
            Unit Configuration
          </span>
          <span className="font-mono text-[10px] text-text-muted tracking-widest">
            FORM-UNIT-REG
          </span>
        </div>

        <form action={formAction} className="space-y-6">
          {/* Unit Designation */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase"
            >
              Unit Designation
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={64}
              placeholder="e.g. TASK FORCE GHOST"
              className="mtc-input font-mono text-sm uppercase"
            />
            <p className="font-mono text-[9px] text-text-muted tracking-wider">
              The official name of your squadron or task force.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="description"
              className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase"
            >
              Mission Brief{" "}
              <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              maxLength={256}
              placeholder="Brief description of this unit's operational focus..."
              className="mtc-input font-mono text-sm resize-none leading-relaxed"
            />
          </div>

          {/* Error */}
          {state.error && (
            <div className="border border-danger/30 bg-danger/5 px-3 py-2">
              <p className="font-mono text-[11px] text-danger tracking-widest">
                ⚠ {state.error}
              </p>
            </div>
          )}

          {/* Info Block */}
          <div className="bg-bg-elevated border border-border px-4 py-3">
            <p className="font-mono text-[10px] text-text-dim tracking-widest leading-relaxed">
              You will be assigned the{" "}
              <span className="text-amber">COMMANDER</span> role automatically.
              Commanders can add operatives, create maps, and manage briefings.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="mtc-btn-primary"
            >
              {isPending ? "REGISTERING..." : "REGISTER UNIT"}
            </button>
            <Link href="/dashboard" className="mtc-btn-ghost">
              CANCEL
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
