"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/auth/confirm?next=/reset-password`,
  });
  // Same answer whether or not the email has an account, so nobody can check who works here.
  if (error && !/not found|rate/i.test(error.message)) return { error: error.message };
  if (error && /rate/i.test(error.message)) return { error: "Too many emails sent. Please wait a few minutes and try again." };
  return { ok: "If this email has an account, a reset link is on its way. Check your inbox and spam folder." };
}

export async function setNewPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "The two passwords do not match." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "This reset link has expired. Ask for a new one." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  // Retailers reset from the OMSUN Mitra app; they log in there, not in the admin app.
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role === "retailer" || profile?.role === "customer") {
    await supabase.auth.signOut();
    return { ok: "Password changed. Open the OMSUN Mitra app and log in with your new password. / पासवर्ड बदलला, आता ॲपमध्ये लॉग इन करा." };
  }
  redirect("/admin");
}
