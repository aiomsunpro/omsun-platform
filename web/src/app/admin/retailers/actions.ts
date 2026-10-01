"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import type { ActionState } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function addRetailer(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager", "sales_executive"]);
  const mobile = s(f, "mobile").replace(/\D/g, "").slice(-10);
  if (mobile.length !== 10) return { error: "Mobile number must have 10 digits." };
  const { error } = await supabase.from("retailers").insert({
    business_name: s(f, "business_name"),
    owner_name: s(f, "owner_name"),
    mobile,
    village: s(f, "village") || null,
    taluka: s(f, "taluka") || null,
    district: s(f, "district") || null,
    business_type: s(f, "business_type") || null,
  });
  if (error) {
    return { error: error.code === "23505" ? "A retailer with this mobile number already exists." : error.message };
  }
  revalidatePath("/admin/retailers");
  return { ok: "Retailer added. They link automatically when they sign in to OMSUN Mitra with this mobile." };
}

export async function setRetailerStatus(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager"]);
  const { error } = await supabase
    .from("retailers")
    .update({ status: s(f, "status") })
    .eq("id", s(f, "id"));
  if (error) return { error: error.message };
  revalidatePath("/admin/retailers");
  return { ok: "Updated." };
}

export async function setJoiningFeePaid(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager"]);
  const { error } = await supabase
    .from("retailers")
    .update({ joining_fee_paid: s(f, "paid") === "true" })
    .eq("id", s(f, "id"));
  if (error) return { error: error.message };
  revalidatePath("/admin/retailers");
  return { ok: "Updated." };
}
