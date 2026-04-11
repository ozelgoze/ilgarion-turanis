"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type AuthActionResult } from "@/app/actions/auth";
import MtcLogo from "@/components/mtc-logo";

const initialState: AuthActionResult = {};

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialState
  );

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <MtcLogo />
        <div className="mt-4 text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-text-dim uppercase">
            Ilgarion Command · Turanis Sector
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] text-text-muted mt-1 uppercase">
            New Operative Registration
          </p>
        </div>
      </div>

      {/* Register Panel */}
      <div className="mtc-panel bg-bg-surface p-8">
        {/* Panel Header */}
        <div className="border-b border-border pb-4 mb-6 flex items-center justify-between">
          <h1 className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
            Request Clearance
          </h1>
          <span className="font-mono text-[10px] text-text-muted tracking-widest">
            ENROLL
          </span>
        </div>

        <form action={formAction} className="space-y-5">
          {/* Email */}
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase"
            >
              Operative Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="operative@ilgarion.com"
              className="mtc-input font-mono text-sm"
            />
          </div>

          {/* Callsign */}
          <div className="space-y-1">
            <label
              htmlFor="callsign"
              className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase"
            >
              Callsign{" "}
              <span className="text-text-muted">(3–24 chars)</span>
            </label>
            <input
              id="callsign"
              name="callsign"
              type="text"
              required
              minLength={3}
              maxLength={24}
              autoComplete="username"
              placeholder="VIPER-7"
              className="mtc-input font-mono text-sm uppercase"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase"
            >
              Access Code{" "}
              <span className="text-text-muted">(min 8 chars)</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="mtc-input font-mono text-sm"
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label
              htmlFor="confirmPassword"
              className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase"
            >
              Confirm Access Code
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="mtc-input font-mono text-sm"
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

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="mtc-btn-primary w-full mt-2"
          >
            {isPending ? "ENROLLING..." : "SUBMIT REQUEST"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border text-center">
          <p className="font-mono text-[10px] text-text-muted tracking-widest">
            ALREADY ENROLLED?{" "}
            <Link
              href="/login"
              className="text-accent hover:text-accent-dim transition-colors"
            >
              AUTHENTICATE
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-between">
        <span className="font-mono text-[9px] text-text-muted tracking-widest">
          ENCRYPTED CHANNEL
        </span>
        <span className="font-mono text-[9px] text-text-muted tracking-widest">
          MTC-SYS-ENROLL
        </span>
      </div>
    </div>
  );
}
