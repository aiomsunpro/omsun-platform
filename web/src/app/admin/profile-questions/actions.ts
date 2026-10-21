"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { field, optional } from "@/lib/form";
import type { ActionState } from "@/lib/types";
import type { FieldOption } from "@/lib/yojana";

// One option per line: value | English | मराठी | हिंदी | min | max (min and max only for income bands).
function parseOptions(text: string): FieldOption[] | string {
  const out: FieldOption[] = [];
  for (const [i, line] of text.split("\n").map((l) => l.trim()).filter(Boolean).entries()) {
    const [value, en, mr, hi, min, max] = line.split("|").map((p) => p.trim());
    if (!/^[a-z0-9_]{1,40}$/.test(value ?? "")) return `Line ${i + 1}: the value must be small letters, digits and _ only.`;
    if (!en || !mr) return `Line ${i + 1}: give the English and Marathi words.`;
    const o: FieldOption = { value, en, mr };
    if (hi) o.hi = hi;
    if (min) o.min = Number(min);
    if (max) o.max = Number(max);
    if ((min && !Number.isFinite(o.min)) || (max && !Number.isFinite(o.max))) return `Line ${i + 1}: min and max must be numbers.`;
    out.push(o);
  }
  return out;
}

export async function updateQuestion(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const options = parseOptions(field(f, "options"));
  if (typeof options === "string") return { error: options };
  const { error } = await supabase
    .from("profile_fields")
    .update({
      label_en: field(f, "label_en"),
      label_mr: field(f, "label_mr"),
      label_hi: optional(f, "label_hi"),
      help_en: optional(f, "help_en"),
      help_mr: optional(f, "help_mr"),
      block: Number(field(f, "block") || 1),
      sort_order: Number(field(f, "sort_order") || 0),
      is_active: f.get("is_active") === "on",
      options,
    })
    .eq("key", field(f, "key"));
  if (error) return { error: error.message };
  revalidatePath("/admin/profile-questions");
  return { ok: "Saved. The apps use the new wording from their next load." };
}

export async function addQuestion(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff(["owner"]);
  const options = parseOptions(field(f, "options"));
  if (typeof options === "string") return { error: options };
  const { error } = await supabase.from("profile_fields").insert({
    key: field(f, "key").toLowerCase(),
    scope: field(f, "scope") === "household" ? "household" : "member",
    kind: field(f, "kind"),
    block: Number(field(f, "block") || 1),
    sort_order: Number(field(f, "sort_order") || 0),
    label_en: field(f, "label_en"),
    label_mr: field(f, "label_mr"),
    label_hi: optional(f, "label_hi"),
    options,
  });
  if (error) return { error: error.message.includes("profile_fields_key_check") ? "Key: small letters, digits and _." : error.message };
  revalidatePath("/admin/profile-questions");
  return { ok: "Question added. Schemes can use it in their rules now." };
}
