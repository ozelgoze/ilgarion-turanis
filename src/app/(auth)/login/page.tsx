"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionResult } from "@/app/actions/auth";
import AppLogo from "@/components/mtc-logo";

const initialState: AuthActionResult = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <AppLogo />
      </div>

      {/* Login Panel */}
      <div className="mtc-panel bg-bg-surface p-8">
        {/* Panel Header */}
        <div className="border-b border-border pb-4 mb-6 flex items-center justify-between">
          <h1 className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
            Authentication Required
          </h1>
          <span className="font-mono text-[10px] text-text-muted tracking-widest">
            SEC-LVL-4
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

          {/* Password */}
          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block font-mono text-[10px] tracking-[0.2em] text-text-dim uppercase"
            >
              Access Code
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
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
            {isPending ? "AUTHENTICATING..." : "AUTHENTICATE"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border text-center">
          <p className="font-mono text-[10px] text-text-muted tracking-widest">
            NEW OPERATIVE?{" "}
            <Link
              href="/register"
              className="text-accent hover:text-accent-dim transition-colors"
            >
              REQUEST ACCESS
            </Link>
          </p>
        </div>
      </div>

      {/* Footer Label */}
      <div className="mt-4 flex justify-between">
        <span className="font-mono text-[9px] text-text-muted tracking-widest">
          ENCRYPTED CHANNEL
        </span>
        <span className="font-mono text-[9px] text-text-muted tracking-widest">
          UEE-SYS-AUTH
        </span>
      </div>
    </div>
  );
}
