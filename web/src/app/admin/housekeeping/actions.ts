"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { amount, field, optional } from "@/lib/form";
import type { ActionState } from "@/lib/types";

const KEEPERS = ["owner", "manager", "accountant"] as const;
function done(ok: string): ActionState {
  revalidatePath("/admin/housekeeping");
  return { ok };
}

export async function addHousekeeping(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...KEEPERS]);
  const paid = amount(f, "amount_paid");
  if (Number.isNaN(paid)) return { error: "Enter a valid amount." };
  const { error } = await supabase.from("housekeeping_log").insert({
    staff_name: field(f, "staff_name"),
    work_date: field(f, "work_date") || undefined,
    is_present: field(f, "is_present") !== "no",
    work_done: optional(f, "work_done"),
    amount_paid: paid,
    notes: optional(f, "notes"),
  });
  return error ? { error: error.message } : done("Saved.");
}

export async function deleteHousekeeping(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const { error } = await supabase.from("housekeeping_log").delete().eq("id", field(f, "id"));
  return error ? { error: error.message } : done("Deleted.");
}

export async function addWaterBill(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...KEEPERS]);
  const bill = amount(f, "amount");
  const month = field(f, "bill_month");
  if (!(bill > 0)) return { error: "Enter the bill amount." };
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Choose the month." };
  const paid = field(f, "paid") === "yes";
  const { error } = await supabase.from("water_bills").insert({
    bill_month: `${month}-01`,
    vendor: optional(f, "vendor"),
    amount: bill,
    paid,
    paid_on: paid ? field(f, "paid_on") || new Date().toISOString().slice(0, 10) : null,
    notes: optional(f, "notes"),
  });
  return error ? { error: error.message } : done("Bill saved.");
}

export async function markWaterBillPaid(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...KEEPERS]);
  const { error } = await supabase
    .from("water_bills")
    .update({ paid: true, paid_on: field(f, "paid_on") || new Date().toISOString().slice(0, 10) })
    .eq("id", field(f, "id"));
  return error ? { error: error.message } : done("Marked paid.");
}

export async function deleteWaterBill(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const { error } = await supabase.from("water_bills").delete().eq("id", field(f, "id"));
  return error ? { error: error.message } : done("Deleted.");
}
