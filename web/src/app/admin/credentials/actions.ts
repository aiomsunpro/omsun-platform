"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { field, optional } from "@/lib/form";
import type { ActionState } from "@/lib/types";

function done(ok: string): ActionState {
  revalidatePath("/admin/credentials");
  return { ok };
}

export async function addCredential(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  if (!field(f, "label")) return { error: "Enter what this login is for, e.g. GST portal." };
  const { error } = await supabase.from("credentials").insert({
    label: field(f, "label"),
    customer_id: optional(f, "customer_id"),
    service_id: optional(f, "service_id"),
    username: optional(f, "username"),
    password: optional(f, "password"),
    notes: optional(f, "notes"),
  });
  return error ? { error: error.message } : done("Login saved.");
}

export async function changeCredential(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const update: Record<string, string | null> = {};
  if (field(f, "username")) update.username = field(f, "username");
  if (field(f, "password")) update.password = field(f, "password");
  if (Object.keys(update).length === 0) return { error: "Type a new username or password." };
  const { data, error } = await supabase.from("credentials").update(update).eq("id", field(f, "id")).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "You can only change logins you saved." };
  return done("Updated.");
}

export async function deleteCredential(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.from("credentials").delete().eq("id", field(f, "id")).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "You can only delete logins you saved." };
  return done("Deleted.");
}

/** Sends one password to the browser only when someone clicks Show. */
export async function revealPassword(id: string): Promise<string | null> {
  const { supabase } = await requireStaff();
  const { data } = await supabase.from("credentials").select("password").eq("id", id).maybeSingle<{ password: string | null }>();
  return data?.password ?? null;
}
