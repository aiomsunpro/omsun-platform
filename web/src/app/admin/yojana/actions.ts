"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { field, optional } from "@/lib/form";
import type { ActionState } from "@/lib/types";
import type { Answers } from "@/lib/yojana";

const SCREENERS = ["owner", "manager", "service_executive"] as const;

// A family screened at the OMSUN office. Consent comes first (DPDP Act 2023).
export async function createFamily(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...SCREENERS]);
  if (f.get("consent") !== "on") return { error: "Ask the customer for consent first and tick the box." };
  const mobile = field(f, "mobile").replace(/\D/g, "").slice(-10);
  if (mobile && mobile.length !== 10) return { error: "Mobile number must have 10 digits." };
  const head = field(f, "head_name");
  if (!head) return { error: "Give the name of the person you are talking to." };

  const { data: fam, error } = await supabase
    .from("families")
    .insert({
      family_name: field(f, "family_name") || `${head} family`,
      mobile: mobile || null,
      village: optional(f, "village"),
      taluka: optional(f, "taluka"),
      district: optional(f, "district"),
      consent_method: "verbal",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  const { error: mErr } = await supabase.from("family_members").insert({ family_id: fam.id, full_name: head, relation: "self" });
  if (mErr) return { error: mErr.message };
  revalidatePath("/admin/yojana");
  redirect(`/admin/yojana/${fam.id}`);
}

export async function addMember(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...SCREENERS]);
  const familyId = field(f, "family_id");
  const name = field(f, "full_name");
  if (!name) return { error: "Give the person's name." };
  const { error } = await supabase.from("family_members").insert({
    family_id: familyId,
    full_name: name,
    relation: field(f, "relation") || "other",
    sort_order: Number(field(f, "sort_order") || 0),
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/yojana/${familyId}`);
  return { ok: "Added." };
}

export async function removeMember(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...SCREENERS]);
  const familyId = field(f, "family_id");
  const { error } = await supabase.from("family_members").delete().eq("id", field(f, "member_id"));
  if (error) return { error: error.message };
  revalidatePath(`/admin/yojana/${familyId}`);
  return { ok: "Removed." };
}

// Saves every answer on the page, then screens the family again.
export async function saveAndScreen(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase } = await requireStaff([...SCREENERS]);
  const familyId = field(f, "family_id");
  let payload: { household: Answers; members: Record<string, Answers> };
  try {
    payload = JSON.parse(field(f, "answers"));
  } catch {
    return { error: "The answers could not be read. Reload the page and try again." };
  }

  const { error } = await supabase.from("families").update({ answers: payload.household }).eq("id", familyId);
  if (error) return { error: error.message };
  for (const [id, answers] of Object.entries(payload.members)) {
    const { error: mErr } = await supabase.from("family_members").update({ answers }).eq("id", id).eq("family_id", familyId);
    if (mErr) return { error: mErr.message };
  }
  const { error: sErr } = await supabase.rpc("screen_family", { p_family: familyId });
  if (sErr) return { error: sErr.message };
  revalidatePath(`/admin/yojana/${familyId}`);
  return { ok: "Saved and checked." };
}

// Apply: a walk-in request for the scheme's paid service, at the head-office price.
export async function applyForScheme(_: ActionState, f: FormData): Promise<ActionState> {
  const { supabase, profile } = await requireStaff([...SCREENERS]);
  const familyId = field(f, "family_id");
  const memberId = field(f, "member_id");
  const { data: member } = await supabase
    .from("family_members")
    .select("id, full_name, customer_id, families(mobile, village, taluka, district)")
    .eq("id", memberId)
    .eq("family_id", familyId)
    .maybeSingle<{
      id: string;
      full_name: string;
      customer_id: string | null;
      families: { mobile: string | null; village: string | null; taluka: string | null; district: string | null } | null;
    }>();
  if (!member) return { error: "Pick the family member who is applying." };

  let customerId = member.customer_id;
  if (!customerId) {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        full_name: member.full_name,
        mobile: member.families?.mobile ?? null,
        village: member.families?.village ?? null,
        taluka: member.families?.taluka ?? null,
        district: member.families?.district ?? null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    customerId = data.id;
    await supabase.from("family_members").update({ customer_id: customerId }).eq("id", member.id);
  }

  const { data: req, error } = await supabase
    .from("service_requests")
    .insert({
      channel: "walk_in",
      customer_id: customerId,
      service_id: field(f, "service_id"),
      scheme_id: field(f, "scheme_id"),
      family_member_id: member.id,
      assigned_to: profile.role === "service_executive" ? profile.id : null,
      remarks: optional(f, "remarks"),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/admin");
  redirect(`/admin/requests/${req.id}`);
}
