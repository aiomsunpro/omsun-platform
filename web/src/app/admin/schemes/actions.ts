"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { field, optional } from "@/lib/form";
import type { ActionState } from "@/lib/types";
import { OPS_FOR_KIND, type ProfileField, type SchemeData } from "@/lib/yojana";

const EDITORS = ["owner", "manager"] as const;

function refresh(schemeId?: string, versionId?: string) {
  revalidatePath("/admin/schemes");
  if (schemeId) revalidatePath(`/admin/schemes/${schemeId}`);
  if (versionId) revalidatePath(`/admin/schemes/drafts/${versionId}`);
}

// Start a draft: a new scheme, or a copy of the live version of an existing one.
export async function startDraft(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...EDITORS]);
  const note = field(f, "change_note");
  if (note.length < 3) return { error: "Say what you are changing and why." };
  const schemeId = optional(f, "scheme_id");

  let data: SchemeData;
  if (schemeId) {
    const { data: live } = await supabase
      .from("schemes")
      .select("current_version_id, scheme_versions!schemes_current_version_id_fkey(data)")
      .eq("id", schemeId)
      .maybeSingle<{ current_version_id: string; scheme_versions: { data: SchemeData } | null }>();
    if (!live?.scheme_versions) return { error: "That scheme is not live." };
    data = live.scheme_versions.data;
  } else {
    const code = field(f, "code").toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{1,40}$/.test(code)) return { error: "Code: capital letters, digits and dashes, like MH-LADKI-BAHIN." };
    if (!field(f, "name_en") || !field(f, "name_mr")) return { error: "Give the scheme name in English and Marathi." };
    data = {
      code,
      name_en: field(f, "name_en"),
      name_mr: field(f, "name_mr"),
      level: field(f, "level") === "central" ? "central" : "state",
      state: field(f, "level") === "central" ? null : "MH",
      category: field(f, "category") || "other",
      status: "open",
      rules: [],
      documents: [],
      steps: [],
      service_codes: [],
    };
  }

  const { data: row, error } = await supabase
    .from("scheme_versions")
    .insert({ ...(schemeId ? { scheme_id: schemeId } : {}), data, change_note: note, source: optional(f, "source") })
    .select("id")
    .single();
  if (error) return { error: error.message };
  refresh(schemeId ?? undefined);
  redirect(`/admin/schemes/drafts/${row.id}`);
}

// Checks a draft before saving so the manager sees a clear message instead
// of a database error at approval time.
function checkScheme(d: SchemeData, fields: Map<string, ProfileField>): string | null {
  if (!/^[A-Z0-9][A-Z0-9-]{1,40}$/.test(d.code ?? "")) return "Code: capital letters, digits and dashes.";
  if (!d.name_en?.trim() || !d.name_mr?.trim()) return "Give the scheme name in English and Marathi.";
  if (d.level === "state" && !/^[A-Z]{2}$/.test(d.state ?? "")) return "A state scheme needs a state code, like MH.";
  if (d.benefit_yearly != null && !(Number(d.benefit_yearly) >= 0)) return "Benefit a year must be a number.";
  for (const [i, r] of d.rules.entries()) {
    const f = fields.get(r.field);
    const where = `Rule ${i + 1}`;
    if (!f) return `${where}: pick a question.`;
    if (!OPS_FOR_KIND[f.kind].includes(r.op)) return `${where}: "${r.op}" does not fit the question "${f.label_en}".`;
    if (r.op === "between") {
      const v = r.value as unknown[];
      if (!Array.isArray(v) || v.length !== 2 || v.some((x) => typeof x !== "number") || Number(v[0]) > Number(v[1]))
        return `${where}: give a lower and an upper number.`;
    } else if (r.op === "in" || r.op === "not_in") {
      if (!Array.isArray(r.value) || r.value.length === 0) return `${where}: tick at least one answer.`;
    } else if (r.op !== "exists" && (r.value === null || r.value === undefined || r.value === "")) {
      return `${where}: give a value.`;
    }
  }
  for (const [i, x] of d.documents.entries()) {
    if (!x.name_en?.trim() || !x.name_mr?.trim()) return `Document ${i + 1}: give the name in English and Marathi.`;
  }
  for (const [i, x] of d.steps.entries()) {
    if (!x.what_en?.trim() || !x.what_mr?.trim()) return `Step ${i + 1}: say what happens in English and Marathi.`;
  }
  return null;
}

export async function saveDraft(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...EDITORS]);
  const id = field(f, "id");
  const submit = field(f, "intent") === "submit";
  let data: SchemeData;
  try {
    data = JSON.parse(field(f, "data"));
  } catch {
    return { error: "The form could not be read. Reload the page and try again." };
  }
  const note = field(f, "change_note");
  if (note.length < 3) return { error: "Say what you are changing and why." };

  if (submit) {
    const { data: rows } = await supabase.from("profile_fields").select("*").returns<ProfileField[]>();
    const problem = checkScheme(data, new Map((rows ?? []).map((r) => [r.key, r])));
    if (problem) return { error: problem };
  }

  const { data: row, error } = await supabase
    .from("scheme_versions")
    .update({
      data,
      change_note: note,
      source: optional(f, "source"),
      ...(submit ? { status: "in_review" } : {}),
    })
    .eq("id", id)
    .select("scheme_id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!row) return { error: "You cannot change this draft." };
  refresh(row.scheme_id, id);
  return { ok: submit ? "Sent to the owner for approval." : "Draft saved." };
}

export async function discardDraft(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...EDITORS]);
  const id = field(f, "id");
  const { data: row, error } = await supabase
    .from("scheme_versions")
    .update({ status: "discarded" })
    .eq("id", id)
    .select("scheme_id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!row) return { error: "You cannot change this draft." };
  refresh(row.scheme_id, id);
  redirect("/admin/schemes");
}

// Owner only (the database refuses anyone else).
export async function reviewVersion(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const id = field(f, "id");
  const approve = field(f, "decision") === "approve";
  const { error } = await supabase.rpc("review_scheme_version", {
    p_version: id,
    p_approve: approve,
    p_note: optional(f, "review_note"),
  });
  if (error) return { error: error.message };
  refresh(field(f, "scheme_id"), id);
  return { ok: approve ? "Approved. It is live for every retailer now." : "Sent back to the author." };
}

export async function restoreVersion(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...EDITORS]);
  const note = field(f, "change_note");
  if (note.length < 3) return { error: "Say why you are going back to this version." };
  const { data, error } = await supabase.rpc("restore_scheme_version", { p_version: field(f, "id"), p_note: note });
  if (error) return { error: error.message };
  refresh(field(f, "scheme_id"));
  redirect(`/admin/schemes/drafts/${data}`);
}

export async function closeSuggestion(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...EDITORS]);
  const status = field(f, "status") === "accepted" ? "accepted" : "dismissed";
  const { error } = await supabase.from("scheme_suggestions").update({ status }).eq("id", field(f, "id"));
  if (error) return { error: error.message };
  refresh();
  return { ok: status === "accepted" ? "Marked as taken up." : "Dismissed." };
}
