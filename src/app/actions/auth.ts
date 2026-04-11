"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export interface AuthActionResult {
  error?: string;
}

export async function loginAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "EMAIL AND ACCESS CODE REQUIRED." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("invalid_credentials")
    ) {
      return { error: "AUTHENTICATION FAILED — CREDENTIALS REJECTED." };
    }
    return { error: error.message.toUpperCase() };
  }

  redirect("/dashboard");
}

export async function registerAction(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const callsign = formData.get("callsign") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!email || !callsign || !password) {
    return { error: "ALL FIELDS REQUIRED." };
  }

  if (callsign.length < 3 || callsign.length > 24) {
    return { error: "CALLSIGN MUST BE 3–24 CHARACTERS." };
  }

  if (password.length < 8) {
    return { error: "ACCESS CODE MUST BE 8+ CHARACTERS." };
  }

  if (password !== confirmPassword) {
    return { error: "ACCESS CODE MISMATCH — VERIFY ENTRY." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { callsign: callsign.toUpperCase() },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "EMAIL ALREADY IN USE — AUTHENTICATE INSTEAD." };
    }
    return { error: error.message.toUpperCase() };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
