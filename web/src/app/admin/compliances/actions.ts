"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { todayIST } from "@/lib/dates";
import { amount, field, optional } from "@/lib/form";
import type { ActionState } from "@/lib/types";

const WRITERS = ["owner", "manager", "accountant", "service_executive"] as const;
const STATUSES = ["not_started", "in_process", "uploaded", "completed", "delivered", "cancelled", "refunded", "inactive"];

function done(ok: string): ActionState {
  revalidatePath("/admin/compliances");
  return { ok };
}

export async function addCompliance(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...WRITERS]);
  const fee = amount(f, "fee");
  const paid = amount(f, "amount_paid");
  if (Number.isNaN(fee) || Number.isNaN(paid)) return { error: "Enter valid amounts." };
  if (!field(f, "customer_id") || !field(f, "service_id")) return { error: "Choose the customer and the service." };
  const { error } = await supabase.from("compliances").insert({
    customer_id: field(f, "customer_id"),
    service_id: field(f, "service_id"),
    fee,
    amount_paid: paid,
    assigned_to: optional(f, "assigned_to"),
    reference_no: optional(f, "reference_no"),
    notes: optional(f, "notes"),
  });
  return error ? { error: error.message } : done("Compliance added.");
}

export async function updateCompliance(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...WRITERS]);
  const id = field(f, "id");
  const status = field(f, "status");
  if (!STATUSES.includes(status)) return { error: "Choose a status." };
  const paid = amount(f, "amount_paid");
  if (Number.isNaN(paid)) return { error: "Enter a valid amount." };

  const { data: current } = await supabase.from("compliances").select("started_on, completed_on, delivered_on").eq("id", id)
    .maybeSingle<{ started_on: string | null; completed_on: string | null; delivered_on: string | null }>();
  if (!current) return { error: "You can only update compliances assigned to you." };

  // Fill the milestone dates the first time work reaches them.
  const today = todayIST();
  const reached = (s: string[]) => s.includes(status);
  const update: Record<string, unknown> = { status, amount_paid: paid, reference_no: optional(f, "reference_no") };
  if (!current.started_on && reached(["in_process", "uploaded", "completed", "delivered"])) update.started_on = today;
  if (!current.completed_on && reached(["completed", "delivered"])) update.completed_on = today;
  if (!current.delivered_on && status === "delivered") update.delivered_on = today;
  if (f.has("assigned_to")) update.assigned_to = optional(f, "assigned_to");

  const { data, error } = await supabase.from("compliances").update(update).eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "You can only update compliances assigned to you." };
  return done("Updated.");
}
