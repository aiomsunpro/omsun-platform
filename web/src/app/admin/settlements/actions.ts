"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { monthRange } from "@/lib/dates";
import type { ActionState } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createSettlement(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "accountant"]);
  const month = s(f, "month");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Choose a month." };
  const retailer = s(f, "retailer_id");
  if (!retailer) return { error: "Choose a retailer." };
  const { first, last } = monthRange(month);
  const { error } = await supabase.rpc("create_retailer_settlement", { p_retailer: retailer, p_start: first, p_end: last });
  if (error) {
    if (error.code === "23505") return { error: "This retailer already has a settlement for that month." };
    return { error: error.message };
  }
  revalidatePath("/admin/settlements");
  return { ok: "Settlement drafted." };
}

export async function finalizeSettlement(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "accountant"]);
  const { error } = await supabase.rpc("finalize_retailer_settlement", { p_settlement: s(f, "id") });
  if (error) return { error: error.message };
  revalidatePath("/admin/settlements");
  return { ok: "Finalized." };
}
