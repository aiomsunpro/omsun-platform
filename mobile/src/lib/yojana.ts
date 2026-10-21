import { supabase } from "./supabase";
import { must } from "./use-load";

// Yojana check: shapes and loaders. The database decides eligibility
// (screen_family); the app only collects answers and shows results.

export const DONT_KNOW = "dont_know";

export type FieldKind = "number" | "band" | "choice" | "multi" | "yes_no" | "date";
export type FieldOption = { value: string; en: string; mr: string; hi?: string };
export type ProfileField = {
  key: string;
  scope: "household" | "member";
  kind: FieldKind;
  block: number;
  label_en: string;
  label_mr: string;
  help_en: string | null;
  help_mr: string | null;
  options: FieldOption[];
  sort_order: number;
};
export type Answers = Record<string, unknown>;

export type Family = {
  id: string;
  family_name: string;
  mobile: string | null;
  village: string | null;
  answers: Answers;
  consent_at: string | null;
  updated_at: string;
};

export type Member = { id: string; full_name: string; relation: string; customer_id: string | null; answers: Answers; sort_order: number };

export type ScreenResult = "eligible" | "check" | "not_eligible";

export type SchemeService = {
  id: string;
  name_en: string;
  name_mr: string;
  customer_price: number;
  govt_fee: number;
  service_charge: number;
  retailer_commission: number;
  is_active: boolean;
  available_to_retailers: boolean;
};

export type Result = {
  id: number;
  member_id: string | null;
  result: ScreenResult;
  passed_fields: string[];
  failed_fields: string[];
  missing_fields: string[];
  manual_notes: string[];
  schemes: {
    id: string;
    code: string;
    name_en: string;
    name_mr: string;
    benefit_en: string | null;
    benefit_mr: string | null;
    benefit_yearly: number | null;
    apply_url: string | null;
    scheme_documents: { name_en: string; name_mr: string; is_mandatory: boolean; sort_order: number }[];
    scheme_services: { services: SchemeService | null }[];
  } | null;
};

export type Followup = { field: string; member_id: string | null; label_en: string; label_mr: string; schemes: number };

export const RELATIONS = ["self", "spouse", "son", "daughter", "father", "mother", "other"] as const;

export async function loadFields(): Promise<ProfileField[]> {
  const res = await supabase.from("profile_fields").select("*").eq("is_active", true).order("block").order("sort_order");
  return must(res) as ProfileField[];
}

export async function loadFamily(id: string) {
  const [family, members, fields, screening] = await Promise.all([
    supabase.from("families").select("id, family_name, mobile, village, answers, consent_at, updated_at").eq("id", id).single(),
    supabase.from("family_members").select("id, full_name, relation, customer_id, answers, sort_order").eq("family_id", id).order("sort_order").order("created_at"),
    loadFields(),
    supabase.from("screenings").select("id, run_at").eq("family_id", id).order("run_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const last = must(screening) as { id: string; run_at: string } | null;
  let results: Result[] = [];
  let followups: Followup[] = [];
  if (last) {
    const [r, f] = await Promise.all([
      supabase
        .from("screening_results")
        .select(
          "id, member_id, result, passed_fields, failed_fields, missing_fields, manual_notes, schemes(id, code, name_en, name_mr, benefit_en, benefit_mr, benefit_yearly, apply_url, scheme_documents(name_en, name_mr, is_mandatory, sort_order), scheme_services(services(id, name_en, name_mr, customer_price, govt_fee, service_charge, retailer_commission, is_active, available_to_retailers)))",
        )
        .eq("screening_id", last.id),
      supabase.rpc("screening_followups", { p_screening: last.id }),
    ]);
    results = must(r) as unknown as Result[];
    followups = (f.data ?? []) as Followup[];
  }
  return {
    family: must(family) as Family,
    members: must(members) as Member[],
    fields,
    screening: last,
    results,
    followups,
  };
}

/** Saves the answers and screens the family again. */
export async function saveAndScreen(familyId: string, household: Answers, members: Record<string, Answers>) {
  const { error } = await supabase.from("families").update({ answers: household }).eq("id", familyId);
  if (error) throw error;
  for (const [id, answers] of Object.entries(members)) {
    const { error: e } = await supabase.from("family_members").update({ answers }).eq("id", id);
    if (e) throw e;
  }
  const { error: s } = await supabase.rpc("screen_family", { p_family: familyId });
  if (s) throw s;
}

/** The paid service a retailer can sell for a scheme, if head office has linked one. */
export function serviceFor(r: Result) {
  return r.schemes?.scheme_services.map((x) => x.services).find((s) => s?.is_active && s.available_to_retailers) ?? null;
}
