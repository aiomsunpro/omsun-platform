"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const path = (type: string) => (type === "enquiry" ? "/admin/enquiries" : "/admin/leads");

export async function createLead(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireStaff(["owner", "manager", "sales_executive", "service_executive"]);
  const type = s(f, "lead_type") === "enquiry" ? "enquiry" : "retailer";
  const mobile = s(f, "mobile").replace(/\D/g, "").slice(-10);
  if (mobile.length !== 10) return { error: "Mobile number must have 10 digits." };
  const pickAssignee = profile.role === "owner" || profile.role === "manager";
  const { data, error } = await supabase
    .from("leads")
    .insert({
      lead_type: type,
      full_name: s(f, "full_name"),
      mobile,
      village: s(f, "village") || null,
      taluka: s(f, "taluka") || null,
      district: s(f, "district") || null,
      business_type: s(f, "business_type") || null,
      source: s(f, "source") || null,
      interest: s(f, "interest") || null,
      service_id: s(f, "service_id") || null,
      next_follow_up_on: s(f, "next_follow_up_on") || null,
      notes: s(f, "notes") || null,
      assigned_to: (pickAssignee && s(f, "assigned_to")) || profile.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath(path(type));
  redirect(`/admin/leads/${data.id}`);
}

export async function updateLead(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireStaff(["owner", "manager", "sales_executive", "service_executive"]);
  const id = s(f, "id");
  const changes: Record<string, unknown> = {
    stage: s(f, "stage"),
    next_follow_up_on: s(f, "next_follow_up_on") || null,
    notes: s(f, "notes") || null,
  };
  if ((profile.role === "owner" || profile.role === "manager") && f.has("assigned_to")) {
    changes.assigned_to = s(f, "assigned_to") || null;
  }
  const { error } = await supabase.from("leads").update(changes).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/leads/${id}`);
  return { ok: "Saved." };
}

export async function logActivity(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager", "sales_executive", "service_executive"]);
  const id = s(f, "lead_id");
  const { error } = await supabase.from("lead_activities").insert({
    lead_id: id,
    activity_type: s(f, "activity_type"),
    outcome: s(f, "outcome") || null,
    notes: s(f, "notes") || null,
  });
  if (error) return { error: error.message };
  const next = s(f, "next_follow_up_on");
  if (next) {
    const { error: e2 } = await supabase.from("leads").update({ next_follow_up_on: next }).eq("id", id);
    if (e2) return { error: e2.message };
  }
  revalidatePath(`/admin/leads/${id}`);
  return { ok: "Logged." };
}
