"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import type { ActionState, RequestStatus } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// Every action runs as the signed-in user; the database rules decide what is allowed
// and their messages are shown to the user as-is.

export async function createWalkIn(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireStaff(["owner", "manager", "service_executive"]);
  const mobile = s(f, "mobile").replace(/\D/g, "").slice(-10);
  const name = s(f, "full_name");
  if (!name) return { error: "Customer name is required." };
  if (mobile && mobile.length !== 10) return { error: "Mobile number must have 10 digits." };

  let customerId: string | undefined;
  if (mobile) {
    const { data: existing } = await supabase
      .from("customers")
      .select("id")
      .eq("mobile", mobile)
      .is("retailer_id", null)
      .limit(1)
      .maybeSingle();
    customerId = existing?.id;
  }
  if (!customerId) {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        full_name: name,
        mobile: mobile || null,
        village: s(f, "village") || null,
        taluka: s(f, "taluka") || null,
        district: s(f, "district") || null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    customerId = data.id;
  }

  // A service executive always takes their own walk-ins.
  const assignedTo =
    profile.role === "service_executive" ? profile.id : s(f, "assigned_to") || null;

  const { data: req, error } = await supabase
    .from("service_requests")
    .insert({
      channel: "walk_in",
      customer_id: customerId,
      service_id: s(f, "service_id"),
      assigned_to: assignedTo,
      priority: s(f, "priority") === "urgent" ? "urgent" : "normal",
      remarks: s(f, "remarks") || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin");
  redirect(`/admin/requests/${req.id}`);
}

export async function changeStatus(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager", "service_executive"]);
  const id = s(f, "id");
  const status = s(f, "status") as RequestStatus;
  if (!status) return { error: "Choose the new status." };
  const { error } = await supabase
    .from("service_requests")
    .update({ status, last_status_note: s(f, "note") || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/requests/${id}`);
  return { ok: "Status updated." };
}

export async function assignRequest(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager"]);
  const id = s(f, "id");
  const { error } = await supabase
    .from("service_requests")
    .update({ assigned_to: s(f, "assigned_to") || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/requests/${id}`);
  return { ok: "Assigned." };
}

export async function uploadDocument(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager", "service_executive"]);
  const id = s(f, "id");
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file." };
  if (file.size > 10 * 1024 * 1024) return { error: "File is larger than 10 MB." };

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${id}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage
    .from("request-documents")
    .upload(path, file, { contentType: file.type || undefined });
  if (upErr) return { error: upErr.message };

  const { error } = await supabase.from("request_documents").insert({
    request_id: id,
    kind: s(f, "kind") === "output" ? "output" : "input",
    document_name: s(f, "document_name") || file.name,
    storage_path: path,
    mime_type: file.type || null,
    size_bytes: file.size,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/requests/${id}`);
  return { ok: "Uploaded." };
}

export async function verifyDocument(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager", "service_executive"]);
  const { error } = await supabase
    .from("request_documents")
    .update({ verification: s(f, "verification"), verification_note: s(f, "note") || null })
    .eq("id", s(f, "doc_id"));
  if (error) return { error: error.message };
  revalidatePath(`/admin/requests/${s(f, "id")}`);
  return { ok: "Saved." };
}

export async function recordPayment(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner", "manager", "accountant", "service_executive"]);
  const id = s(f, "id");
  const amount = Number(s(f, "amount"));
  if (!(amount > 0)) return { error: "Enter an amount above zero." };
  const method = s(f, "method");
  if (method !== "cash" && !s(f, "reference")) return { error: "Enter the UPI / bank reference." };

  const { data, error } = await supabase
    .from("payments")
    .insert({
      purpose: "service",
      request_id: id,
      payer_type: s(f, "payer_type") === "retailer" ? "retailer" : "customer",
      amount,
      method,
      reference: s(f, "reference") || null,
      paid_on: s(f, "paid_on") || undefined,
    })
    .select("receipt_number")
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/admin/requests/${id}`);
  return { ok: `Recorded. Receipt ${data.receipt_number}.` };
}
