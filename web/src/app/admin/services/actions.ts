"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => Number(s(f, k) || 0);

export async function addCategory(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager"]);
  const { error } = await supabase.from("service_categories").insert({
    name_en: s(f, "name_en"),
    name_mr: s(f, "name_mr"),
    sort_order: n(f, "sort_order"),
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/services");
  return { ok: "Category added." };
}

function serviceFields(f: FormData) {
  return {
    category_id: s(f, "category_id"),
    code: s(f, "code").toUpperCase(),
    name_en: s(f, "name_en"),
    name_mr: s(f, "name_mr"),
    description_en: s(f, "description_en") || null,
    description_mr: s(f, "description_mr") || null,
    instructions_en: s(f, "instructions_en") || null,
    instructions_mr: s(f, "instructions_mr") || null,
    govt_fee: n(f, "govt_fee"),
    service_charge: n(f, "service_charge"),
    retailer_commission: n(f, "retailer_commission"),
    processing_days: s(f, "processing_days") ? n(f, "processing_days") : null,
    available_to_retailers: f.get("available_to_retailers") === "on",
    is_active: f.get("is_active") === "on",
  };
}

export async function addService(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const { data, error } = await supabase.from("services").insert(serviceFields(f)).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/admin/services");
  redirect(`/admin/services/${data.id}`);
}

export async function updateService(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager"]);
  const id = s(f, "id");
  const { error } = await supabase.from("services").update(serviceFields(f)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/services/${id}`);
  revalidatePath("/admin/services");
  return { ok: "Saved." };
}

export async function addRequiredDocument(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager"]);
  const id = s(f, "service_id");
  const { error } = await supabase.from("service_required_documents").insert({
    service_id: id,
    name_en: s(f, "name_en"),
    name_mr: s(f, "name_mr"),
    is_mandatory: f.get("is_mandatory") === "on",
    sort_order: n(f, "sort_order"),
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/services/${id}`);
  return { ok: "Added." };
}

export async function removeRequiredDocument(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager"]);
  const id = s(f, "service_id");
  const { error } = await supabase.from("service_required_documents").delete().eq("id", s(f, "doc_id"));
  if (error) return { error: error.message };
  revalidatePath(`/admin/services/${id}`);
  return { ok: "Removed." };
}
