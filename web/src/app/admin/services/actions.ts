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

// Paste many services at once, one per line, comma or tab separated (a copy
// from Excel works): Category, Name (English), Name (Marathi), Govt fee,
// Service charge, Commission, Days. New categories are created on the way.
export async function addServicesBulk(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const lines = s(f, "list").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { error: "Paste at least one service." };
  if (lines.length > 300) return { error: "Paste at most 300 services at a time." };

  const [{ data: cats, error: e1 }, { data: existing, error: e2 }] = await Promise.all([
    supabase.from("service_categories").select("id, name_en"),
    supabase.from("services").select("code, name_en"),
  ]);
  if (e1 || e2) return { error: (e1 ?? e2)!.message };
  const catId = new Map((cats ?? []).map((c) => [c.name_en.toLowerCase(), c.id as string]));
  const codes = new Set((existing ?? []).map((x) => x.code as string));
  const names = new Set((existing ?? []).map((x) => (x.name_en as string).toLowerCase()));

  const rows: { category: string; name_en: string; name_mr: string; govt_fee: number; service_charge: number; retailer_commission: number; processing_days: number | null }[] = [];
  const problems: string[] = [];
  const money = (v: string | undefined) => Number((v ?? "").replace(/[₹,\s]/g, "") || 0);
  lines.forEach((line, i) => {
    const c = line.split(line.includes("\t") ? "\t" : ",").map((x) => x.trim());
    const [category, name_en, name_mr] = c;
    const row = {
      category,
      name_en,
      name_mr: name_mr || name_en,
      govt_fee: money(c[3]),
      service_charge: money(c[4]),
      retailer_commission: money(c[5]),
      processing_days: c[6] ? Number(c[6]) : null,
    };
    const n = `Line ${i + 1}`;
    if (/^category$/i.test(category)) return; // header row
    if (!category || !name_en) problems.push(`${n}: needs a category and an English name.`);
    else if ([row.govt_fee, row.service_charge, row.retailer_commission].some((v) => !Number.isFinite(v) || v < 0))
      problems.push(`${n}: fees must be numbers.`);
    else if (row.retailer_commission > row.service_charge) problems.push(`${n}: commission is more than the service charge.`);
    else if (row.processing_days !== null && !Number.isInteger(row.processing_days)) problems.push(`${n}: days must be a whole number.`);
    else if (names.has(name_en.toLowerCase())) problems.push(`${n}: “${name_en}” is already in the list.`);
    else {
      names.add(name_en.toLowerCase());
      rows.push(row);
    }
  });
  if (problems.length) return { error: `Nothing was added. ${problems.slice(0, 5).join(" ")}${problems.length > 5 ? ` …and ${problems.length - 5} more.` : ""}` };
  if (rows.length === 0) return { error: "Paste at least one service." };

  const newCats = [...new Set(rows.map((r) => r.category).filter((c) => !catId.has(c.toLowerCase())))];
  if (newCats.length) {
    const { data, error } = await supabase
      .from("service_categories")
      .insert(newCats.map((name) => ({ name_en: name, name_mr: name })))
      .select("id, name_en");
    if (error) return { error: error.message };
    data.forEach((c) => catId.set(c.name_en.toLowerCase(), c.id));
  }

  // Codes come from the English name: "New PAN Card" -> NEW-PAN-CARD.
  const code = (name: string) => {
    const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "SERVICE";
    let c = base;
    for (let k = 2; codes.has(c); k++) c = `${base}-${k}`;
    codes.add(c);
    return c;
  };
  const { error } = await supabase.from("services").insert(
    rows.map(({ category, ...r }) => ({ ...r, category_id: catId.get(category.toLowerCase())!, code: code(r.name_en) })),
  );
  if (error) return { error: error.message };
  revalidatePath("/admin/services");
  return { ok: `${rows.length} service${rows.length === 1 ? "" : "s"} added.` };
}
