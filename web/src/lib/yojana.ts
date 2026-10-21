// Yojana eligibility: shapes and wording shared by the admin screens.
// The database (supabase/migrations/2026102112*_yojana_*.sql) is the source of truth.

export type FieldScope = "household" | "member";
export type FieldKind = "number" | "band" | "choice" | "multi" | "yes_no" | "date";
export type RuleOp =
  | "="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "between"
  | "in"
  | "not_in"
  | "contains"
  | "not_contains"
  | "exists";
export type VersionStatus = "draft" | "in_review" | "sent_back" | "published" | "discarded";

export type FieldOption = { value: string; en: string; mr: string; hi?: string; min?: number; max?: number };

export type ProfileField = {
  key: string;
  scope: FieldScope;
  kind: FieldKind;
  block: number;
  label_en: string;
  label_mr: string;
  label_hi: string | null;
  help_en: string | null;
  help_mr: string | null;
  options: FieldOption[];
  sort_order: number;
  is_active: boolean;
};

export type SchemeRule = {
  rule_group?: number;
  field: string;
  op: RuleOp;
  value?: unknown;
  is_exclusion?: boolean;
  manual_check?: boolean;
  question_en?: string;
  question_mr?: string;
  note?: string;
};

export type SchemeDocument = {
  name_en: string;
  name_mr: string;
  is_mandatory?: boolean;
  issued_by?: string;
  help_service_code?: string;
};

export type SchemeStep = {
  step_no?: number;
  where_en?: string;
  where_mr?: string;
  what_en: string;
  what_mr: string;
  typical_days?: number | null;
};

// One whole scheme, as a draft holds it (scheme_versions.data).
export type SchemeData = {
  code: string;
  name_en: string;
  name_mr: string;
  name_hi?: string;
  level: "central" | "state";
  state?: string | null;
  department?: string;
  category: string;
  benefit_en?: string;
  benefit_mr?: string;
  benefit_hi?: string;
  benefit_type?: string;
  benefit_yearly?: number | null;
  apply_url?: string;
  apply_mode?: string;
  status: "open" | "closed" | "seasonal";
  deadline?: string | null;
  last_verified_on?: string | null;
  source_url?: string;
  rules: SchemeRule[];
  documents: SchemeDocument[];
  steps: SchemeStep[];
  service_codes: string[];
};

export type SchemeVersion = {
  id: string;
  scheme_id: string;
  version_no: number;
  data: SchemeData;
  status: VersionStatus;
  change_note: string;
  source: string | null;
  based_on: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  published_at: string | null;
};

export type Scheme = {
  id: string;
  code: string;
  name_en: string;
  name_mr: string;
  level: "central" | "state";
  state: string | null;
  category: string;
  benefit_yearly: number | null;
  status: "open" | "closed" | "seasonal";
  last_verified_on: string | null;
  current_version_id: string | null;
  published_at: string;
};

export const VERSION_LABEL: Record<VersionStatus, string> = {
  draft: "Draft",
  in_review: "Waiting for owner",
  sent_back: "Sent back",
  published: "Published",
  discarded: "Discarded",
};

export const VERSION_COLOR: Record<VersionStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  in_review: "bg-yellow-100 text-yellow-800",
  sent_back: "bg-orange-100 text-orange-800",
  published: "bg-green-100 text-green-800",
  discarded: "bg-gray-100 text-gray-400",
};

export const CATEGORIES: [string, string][] = [
  ["agriculture", "Agriculture"],
  ["education", "Education"],
  ["health", "Health"],
  ["pension", "Pension"],
  ["housing", "Housing"],
  ["business", "Business"],
  ["women_child", "Women and child"],
  ["welfare", "Worker welfare"],
  ["other", "Other"],
];

export const OP_LABEL: Record<RuleOp, string> = {
  "=": "is",
  "!=": "is not",
  "<": "is under",
  "<=": "is at most",
  ">": "is over",
  ">=": "is at least",
  between: "is between",
  in: "is one of",
  not_in: "is none of",
  contains: "includes",
  not_contains: "does not include",
  exists: "is answered",
};

// Which comparisons make sense for each kind of question.
export const OPS_FOR_KIND: Record<FieldKind, RuleOp[]> = {
  number: ["<=", "<", ">=", ">", "between", "=", "!="],
  band: ["<=", "<", ">=", ">", "between", "in", "not_in"],
  choice: ["=", "!=", "in", "not_in"],
  yes_no: ["="],
  multi: ["contains", "not_contains", "exists"],
  date: ["<=", "<", ">=", ">", "="],
};

/** A starting value for a rule after its field or comparison changes. */
export function defaultValue(field: ProfileField | undefined, op: RuleOp): unknown {
  if (!field || op === "exists") return null;
  if (op === "between") return [0, 0];
  if (op === "in" || op === "not_in") return [];
  if (field.kind === "yes_no") return true;
  if (field.kind === "number" || field.kind === "band") return 0;
  if (field.kind === "date") return "";
  return field.options[0]?.value ?? "";
}

const optionLabel = (f: ProfileField | undefined, v: unknown) =>
  f?.options.find((o) => o.value === v)?.en ?? String(v);

const num = (v: unknown) => Number(v).toLocaleString("en-IN");

/** "Family income a year is at most 2,50,000" — one rule in plain words. */
export function ruleSentence(rule: SchemeRule, fields: Map<string, ProfileField>) {
  const f = fields.get(rule.field);
  const label = f?.label_en ?? rule.field;
  let value = "";
  if (rule.op === "exists") value = "";
  else if (rule.op === "between" && Array.isArray(rule.value)) value = `${num(rule.value[0])} and ${num(rule.value[1])}`;
  else if (Array.isArray(rule.value)) value = rule.value.map((v) => optionLabel(f, v)).join(", ");
  else if (f?.kind === "yes_no") value = rule.value ? "Yes" : "No";
  else if (f?.kind === "number" || f?.kind === "band") value = num(rule.value);
  else value = optionLabel(f, rule.value);
  return `${label} ${OP_LABEL[rule.op]}${value ? ` ${value}` : ""}`;
}

/** Rules grouped as the engine reads them: AND inside a group, OR across groups. */
export function ruleGroups(rules: SchemeRule[]) {
  const groups = new Map<number, SchemeRule[]>();
  for (const r of rules.filter((r) => !r.is_exclusion)) {
    const g = r.rule_group ?? 1;
    groups.set(g, [...(groups.get(g) ?? []), r]);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

export function emptyScheme(): SchemeData {
  return {
    code: "",
    name_en: "",
    name_mr: "",
    level: "state",
    state: "MH",
    category: "welfare",
    status: "open",
    rules: [],
    documents: [],
    steps: [],
    service_codes: [],
  };
}

const BASIC_FIELDS: [keyof SchemeData, string][] = [
  ["code", "Code"],
  ["name_en", "Name (English)"],
  ["name_mr", "Name (Marathi)"],
  ["name_hi", "Name (Hindi)"],
  ["level", "Level"],
  ["state", "State"],
  ["department", "Department"],
  ["category", "Category"],
  ["benefit_en", "Benefit (English)"],
  ["benefit_mr", "Benefit (Marathi)"],
  ["benefit_type", "Benefit type"],
  ["benefit_yearly", "Benefit a year ₹"],
  ["apply_url", "Official link"],
  ["apply_mode", "How to apply"],
  ["status", "Status"],
  ["deadline", "Deadline"],
  ["last_verified_on", "Last checked against GR"],
  ["source_url", "Source link"],
];

export type Change = { label: string; before: string; after: string };

const show = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));

/** What a draft changes compared with the live version, line by line. */
export function schemeChanges(before: SchemeData | null, after: SchemeData, fields: Map<string, ProfileField>): Change[] {
  const out: Change[] = [];
  for (const [k, label] of BASIC_FIELDS) {
    const b = show(before?.[k]);
    const a = show(after[k]);
    if (b !== a) out.push({ label, before: b, after: a });
  }
  const lines = (d: SchemeData | null) => ({
    Rules: ruleGroups(d?.rules ?? []).flatMap(([g, rs]) => rs.map((r) => `Group ${g}: ${ruleSentence(r, fields)}`)),
    "Not for": (d?.rules ?? []).filter((r) => r.is_exclusion).map((r) => ruleSentence(r, fields)),
    Documents: (d?.documents ?? []).map((x) => `${x.name_en}${x.is_mandatory === false ? " (optional)" : ""}`),
    Steps: (d?.steps ?? []).map((x) => x.what_en),
    "Paid service": d?.service_codes ?? [],
  });
  const b = lines(before);
  const a = lines(after);
  for (const label of Object.keys(a) as (keyof typeof a)[]) {
    const removed = b[label].filter((x) => !a[label].includes(x));
    const added = a[label].filter((x) => !b[label].includes(x));
    if (removed.length || added.length) {
      out.push({ label, before: removed.join("\n") || "—", after: added.join("\n") || "—" });
    }
  }
  return out;
}

export type Family = {
  id: string;
  retailer_id: string | null;
  family_name: string;
  mobile: string | null;
  village: string | null;
  taluka: string | null;
  district: string | null;
  answers: Answers;
  consent_method: "otp" | "verbal" | null;
  consent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FamilyMember = {
  id: string;
  family_id: string;
  customer_id: string | null;
  full_name: string;
  relation: string;
  answers: Answers;
  sort_order: number;
};

export type Answers = Record<string, unknown>;

export const DONT_KNOW = "dont_know";

export const RELATIONS: [string, string, string][] = [
  ["self", "Self", "स्वतः"],
  ["spouse", "Husband / wife", "पती / पत्नी"],
  ["son", "Son", "मुलगा"],
  ["daughter", "Daughter", "मुलगी"],
  ["father", "Father", "वडील"],
  ["mother", "Mother", "आई"],
  ["other", "Other", "इतर"],
];

export type ScreenResult = "eligible" | "check" | "not_eligible";

/** One answer in plain words, for summaries. */
export function answerText(field: ProfileField | undefined, value: unknown) {
  if (value === undefined || value === null || value === "") return "—";
  if (value === DONT_KNOW) return "Don't know";
  if (field?.kind === "yes_no") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.map((v) => optionLabel(field, v)).join(", ") : "None";
  if (field?.kind === "choice" || field?.kind === "band") return optionLabel(field, value);
  return String(value);
}

export const labelsOf = (keys: string[], fields: Map<string, ProfileField>) =>
  keys.map((k) => fields.get(k)?.label_en ?? k).join(", ");
