"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { field, optional } from "@/lib/form";
import type { ActionState } from "@/lib/types";

function done(ok: string): ActionState {
  revalidatePath("/admin/banks");
  return { ok };
}

export async function addBankAccount(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const ifsc = field(f, "ifsc").toUpperCase();
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) return { error: "IFSC looks wrong. It is 11 characters, like SBIN0001234." };
  const { error } = await supabase.from("bank_accounts").insert({
    bank_name: field(f, "bank_name"),
    account_holder: optional(f, "account_holder"),
    account_number: optional(f, "account_number"),
    ifsc: ifsc || null,
    branch: optional(f, "branch"),
    notes: optional(f, "notes"),
  });
  return error ? { error: error.message } : done("Bank account saved.");
}

export async function setBankActive(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const { error } = await supabase.from("bank_accounts").update({ is_active: field(f, "active") === "yes" }).eq("id", field(f, "id"));
  return error ? { error: error.message } : done("Updated.");
}

export async function saveDenominationLimits(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const rows: { denomination: number; max_count: number }[] = [];
  for (const [k, v] of f.entries()) {
    if (!k.startsWith("limit_")) continue;
    const denomination = Number(k.slice(6));
    const max = Number(String(v) || 0);
    if (!Number.isInteger(max) || max < 0) return { error: `Enter a whole number for ₹${denomination}.` };
    rows.push({ denomination, max_count: max });
  }
  const added = Number(field(f, "new_denomination"));
  if (added) {
    if (!Number.isInteger(added) || added <= 0) return { error: "New note value must be a whole rupee amount." };
    rows.push({ denomination: added, max_count: Number(field(f, "new_max") || 0) });
  }
  const { error } = await supabase.from("denomination_limits").upsert(rows);
  return error ? { error: error.message } : done("Limits saved.");
}
