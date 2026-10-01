"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function addCashEntry(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager", "accountant"]);
  const amount = Number(s(f, "amount"));
  if (!(amount > 0)) return { error: "Enter an amount above zero." };
  const category = s(f, "category") === "Other" ? s(f, "other_category") || "Other" : s(f, "category");
  const { error } = await supabase.from("cash_entries").insert({
    direction: s(f, "direction") === "in" ? "in" : "out",
    category,
    amount,
    method: s(f, "method") || "cash",
    entry_date: s(f, "entry_date") || undefined,
    note: s(f, "note") || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/cashbook");
  return { ok: "Entry saved." };
}

export async function voidCashEntry(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "accountant"]);
  const { error } = await supabase
    .from("cash_entries")
    .update({ is_void: true, void_reason: s(f, "reason") || null })
    .eq("id", s(f, "id"));
  if (error) return { error: error.message };
  revalidatePath("/admin/cashbook");
  return { ok: "Voided." };
}
