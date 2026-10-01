"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function verifyPayment(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "accountant"]);
  const { error } = await supabase.from("payments").update({ status: "verified" }).eq("id", s(f, "id"));
  if (error) return { error: error.message };
  revalidatePath("/admin/payments");
  return { ok: "Verified." };
}

export async function reversePayment(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "accountant"]);
  const { error } = await supabase
    .from("payments")
    .update({ status: "reversed", reversal_reason: s(f, "reason") || null })
    .eq("id", s(f, "id"));
  if (error) return { error: error.message };
  revalidatePath("/admin/payments");
  return { ok: "Reversed." };
}
