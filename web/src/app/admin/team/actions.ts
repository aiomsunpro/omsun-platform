"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function updateMember(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager"]);
  const { error } = await supabase
    .from("profiles")
    .update({ role: s(f, "role"), is_active: f.get("is_active") === "on" })
    .eq("id", s(f, "id"));
  if (error) return { error: error.message };
  revalidatePath("/admin/team");
  return { ok: "Saved." };
}
