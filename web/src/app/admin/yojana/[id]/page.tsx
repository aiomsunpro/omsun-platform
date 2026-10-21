import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireStaff } from "@/lib/auth";
import { dateIST, rupees } from "@/lib/format";
import {
  RELATIONS,
  labelsOf,
  type Family,
  type FamilyMember,
  type ProfileField,
  type ScreenResult,
} from "@/lib/yojana";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, PageTitle } from "@/components/ui";
import { addMember, applyForScheme, removeMember, saveAndScreen } from "../actions";
import { ProfileForm } from "../profile-form";

const BLOCKS: Record<number, string> = {
  1: "Basic identity",
  2: "Social category",
  3: "Family and income",
  4: "Occupation",
  5: "Land and housing",
  6: "Life situation",
  7: "Education",
  8: "Existing benefits",
  9: "Documents held",
};

type ResultRow = {
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
    benefit_yearly: number | null;
    apply_url: string | null;
    scheme_documents: { name_en: string; name_mr: string; is_mandatory: boolean; sort_order: number }[];
    scheme_services: { services: { id: string; name_en: string; customer_price: number; govt_fee: number; service_charge: number; is_active: boolean } | null }[];
  } | null;
};

type Followup = { field: string; member_id: string | null; label_en: string; label_mr: string; schemes: number };

export default async function FamilyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  const [{ data: family }, { data: members }, { data: fieldRows }, { data: screening }] = await Promise.all([
    supabase.from("families").select("*, retailers(business_name)").eq("id", id)
      .maybeSingle<Family & { retailers: { business_name: string } | null }>(),
    supabase.from("family_members").select("*").eq("family_id", id).order("sort_order").order("created_at").returns<FamilyMember[]>(),
    supabase.from("profile_fields").select("*").eq("is_active", true).order("block").order("sort_order").returns<ProfileField[]>(),
    supabase.from("screenings").select("id, run_at").eq("family_id", id).order("run_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!family) notFound();
  const fields = new Map((fieldRows ?? []).map((f) => [f.key, f]));
  const screener = can(profile, "owner", "manager", "service_executive");
  const office = family.retailer_id === null;

  const [{ data: results }, { data: followups }] = screening
    ? await Promise.all([
        supabase
          .from("screening_results")
          .select(
            "id, member_id, result, passed_fields, failed_fields, missing_fields, manual_notes, schemes(id, code, name_en, name_mr, benefit_en, benefit_yearly, apply_url, scheme_documents(name_en, name_mr, is_mandatory, sort_order), scheme_services(services(id, name_en, customer_price, govt_fee, service_charge, is_active)))",
          )
          .eq("screening_id", screening.id)
          .returns<ResultRow[]>(),
        supabase.rpc("screening_followups", { p_screening: screening.id }),
      ])
    : [{ data: [] as ResultRow[] }, { data: [] as Followup[] }];

  const memberName = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const top = ((followups ?? []) as Followup[]).slice(0, 5);
  const wanted = top.map((x) => (x.member_id ? `${x.field}:${x.member_id}` : x.field));
  const byBenefit = (a: ResultRow, b: ResultRow) => Number(b.schemes?.benefit_yearly ?? 0) - Number(a.schemes?.benefit_yearly ?? 0);
  const rows = (r: ScreenResult) => (results ?? []).filter((x) => x.result === r).sort(byBenefit);

  return (
    <>
      <PageTitle title={family.family_name}>
        <Link href="/admin/yojana" className="text-sm text-blue-700 underline">All families</Link>
      </PageTitle>
      <p className="mb-6 text-sm text-gray-600">
        {[family.mobile, family.village, family.taluka, family.district].filter(Boolean).join(" · ")}
        {" · "}
        {family.retailers?.business_name ?? "OMSUN office"}
        {family.consent_at && ` · consent recorded ${dateIST(family.consent_at, true)}`}
      </p>

      {screening && (
        <div className="mb-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Eligible" value={rows("eligible").length} tone="text-green-700" />
            <Stat label="Check one more thing" value={rows("check").length} tone="text-yellow-700" />
            <Stat label="Not eligible" value={rows("not_eligible").length} tone="text-gray-500" />
          </div>
          {top.length > 0 && (
            <Card title="Ask these next">
              <ol className="ml-4 list-decimal space-y-1 text-sm">
                {top.map((x) => (
                  <li key={`${x.field}:${x.member_id ?? ""}`}>
                    <span className="font-medium">{x.label_en}</span>
                    {x.member_id && <span> for {memberName.get(x.member_id)}</span>}
                    <span className="text-gray-600"> · {x.label_mr}</span>
                    <span className="text-xs text-gray-500"> · settles {x.schemes} scheme{x.schemes === 1 ? "" : "s"}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-2 text-xs text-gray-500">These are highlighted in the form below.</p>
            </Card>
          )}

          <ResultList title="Eligible" rows={rows("eligible")} kind="eligible" fields={fields} memberName={memberName}
            members={members ?? []} familyId={family.id} canApply={screener && office} />
          <ResultList title="Check one more thing" rows={rows("check")} kind="check" fields={fields} memberName={memberName}
            members={members ?? []} familyId={family.id} canApply={screener && office} />
          <details className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer font-semibold text-blue-950">Not eligible ({rows("not_eligible").length})</summary>
            <ul className="mt-3 divide-y divide-gray-100 text-sm">
              {rows("not_eligible").map((r) => (
                <li key={r.id} className="py-2">
                  {r.schemes?.name_en}
                  {r.member_id && <span className="text-gray-500"> · {memberName.get(r.member_id)}</span>}
                  <span className="text-xs text-gray-500"> · ruled out by {labelsOf(r.failed_fields, fields) || "—"}</span>
                </li>
              ))}
            </ul>
          </details>
          <p className="text-xs text-gray-500">Last checked {dateIST(screening.run_at, true)}.</p>
        </div>
      )}

      <h2 className="mb-3 font-semibold text-blue-950">Family profile</h2>
      {screener && (
        <div className="mb-4 flex flex-wrap items-start gap-4">
          {members?.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-sm">
              {m.full_name}
              <span className="text-xs text-gray-500">{RELATIONS.find((r) => r[0] === m.relation)?.[1]}</span>
              {members.length > 1 && (
                <ActionForm action={removeMember} submitLabel="×" variant="danger" className="">
                  <input type="hidden" name="family_id" value={family.id} />
                  <input type="hidden" name="member_id" value={m.id} />
                </ActionForm>
              )}
            </div>
          ))}
          <ActionForm action={addMember} submitLabel="Add person" variant="secondary" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="family_id" value={family.id} />
            <input type="hidden" name="sort_order" value={(members?.length ?? 0) + 1} />
            <Field label="Name">
              <input name="full_name" required className={inputClass} />
            </Field>
            <Field label="Relation">
              <select name="relation" defaultValue="spouse" className={inputClass}>
                {RELATIONS.map(([v, en, mr]) => (
                  <option key={v} value={v}>{en} · {mr}</option>
                ))}
              </select>
            </Field>
          </ActionForm>
        </div>
      )}
      {screener ? (
        <ProfileForm
          key={screening?.id ?? "new"}
          familyId={family.id}
          fields={fieldRows ?? []}
          household={family.answers ?? {}}
          members={members ?? []}
          wanted={wanted}
          blockNames={BLOCKS}
          save={saveAndScreen}
        />
      ) : (
        <p className="text-sm text-gray-500">Only office staff who screen families can change the answers.</p>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className={`text-3xl font-bold ${tone}`}>{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function ResultList({
  title,
  rows,
  kind,
  fields,
  memberName,
  members,
  familyId,
  canApply,
}: {
  title: string;
  rows: ResultRow[];
  kind: "eligible" | "check";
  fields: Map<string, ProfileField>;
  memberName: Map<string, string>;
  members: FamilyMember[];
  familyId: string;
  canApply: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className={`mb-2 font-semibold ${kind === "eligible" ? "text-green-800" : "text-yellow-800"}`}>
        {title} ({rows.length})
      </h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => {
          const s = r.schemes;
          if (!s) return null;
          const service = s.scheme_services.map((x) => x.services).find((x) => x?.is_active);
          return (
            <section key={r.id} className={`rounded-xl border bg-white p-4 shadow-sm ${kind === "eligible" ? "border-green-200" : "border-yellow-200"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-blue-950">{s.name_en}</div>
                  <div className="text-sm text-gray-600">{s.name_mr}</div>
                </div>
                {r.member_id && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800">{memberName.get(r.member_id)}</span>
                )}
              </div>
              {s.benefit_en && <p className="mt-2 text-sm font-medium text-green-800">{s.benefit_en}</p>}
              <p className="mt-1 text-xs text-gray-600">
                {kind === "eligible"
                  ? `Because: ${labelsOf(r.passed_fields, fields) || "no conditions"}`
                  : `Still to ask: ${labelsOf(r.missing_fields, fields) || "—"}`}
              </p>
              {r.manual_notes.length > 0 && <p className="mt-1 text-xs text-orange-800">Check by hand: {r.manual_notes.join("; ")}</p>}
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-blue-700">Documents ({s.scheme_documents.length})</summary>
                <ul className="ml-4 mt-1 list-disc">
                  {[...s.scheme_documents].sort((a, b) => a.sort_order - b.sort_order).map((d, i) => (
                    <li key={i}>
                      {d.name_en} · {d.name_mr}
                      {!d.is_mandatory && <span className="text-gray-500"> (optional)</span>}
                    </li>
                  ))}
                </ul>
              </details>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
                {service ? (
                  <span className="text-sm">
                    <span className="font-semibold">{rupees(service.customer_price)}</span>
                    <span className="text-xs text-gray-500">
                      {" "}(govt fee {rupees(service.govt_fee)} + service charge {rupees(service.service_charge)})
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">No paid service linked yet</span>
                )}
                {canApply && service && (
                  <ActionForm action={applyForScheme} submitLabel="Apply" className="flex items-center gap-2">
                    <input type="hidden" name="family_id" value={familyId} />
                    <input type="hidden" name="scheme_id" value={s.id} />
                    <input type="hidden" name="service_id" value={service.id} />
                    {r.member_id ? (
                      <input type="hidden" name="member_id" value={r.member_id} />
                    ) : (
                      <select name="member_id" className={`${inputClass} w-40`}>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                    )}
                  </ActionForm>
                )}
                {s.apply_url && (
                  <a href={s.apply_url} target="_blank" rel="noreferrer" className="text-xs text-blue-700 underline">Official site</a>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
