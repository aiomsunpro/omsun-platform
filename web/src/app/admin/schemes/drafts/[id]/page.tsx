import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import { VERSION_COLOR, VERSION_LABEL, type ProfileField, type SchemeData, type SchemeVersion } from "@/lib/yojana";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, PageTitle } from "@/components/ui";
import { discardDraft, reviewVersion, saveDraft } from "../../actions";
import { SchemeEditor } from "../../scheme-editor";
import { ChangeList, SchemeSummary } from "../../scheme-summary";

type Row = SchemeVersion & {
  author: { full_name: string | null } | null;
  reviewer: { full_name: string | null } | null;
};

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  const { data: v } = await supabase
    .from("scheme_versions")
    .select(
      "*, author:profiles!scheme_versions_created_by_fkey(full_name), reviewer:profiles!scheme_versions_reviewed_by_fkey(full_name)",
    )
    .eq("id", id)
    .maybeSingle<Row>();
  if (!v) notFound();

  const [{ data: fieldRows }, { data: services }, { data: live }] = await Promise.all([
    supabase.from("profile_fields").select("*").order("block").order("sort_order").returns<ProfileField[]>(),
    supabase.from("services").select("code, name_en").eq("is_active", true).order("name_en"),
    supabase
      .from("schemes")
      .select("current_version_id, scheme_versions!schemes_current_version_id_fkey(data)")
      .eq("id", v.scheme_id)
      .maybeSingle<{ current_version_id: string; scheme_versions: { data: SchemeData } | null }>(),
  ]);
  const fields = new Map((fieldRows ?? []).map((f) => [f.key, f]));
  const liveData = live?.scheme_versions?.data ?? null;

  const owner = profile.role === "owner";
  const open = v.status === "draft" || v.status === "sent_back";
  const canEdit =
    open && (owner || v.created_by === profile.id || (v.created_by === null && profile.role === "manager"));
  const stale = !!live && live.current_version_id !== v.based_on;

  let impact: { newly_eligible: number; no_longer_eligible: number; people_checked: number } | null = null;
  if (v.status === "in_review" && (owner || profile.role === "manager")) {
    const { data } = await supabase.rpc("scheme_version_impact", { p_version: v.id });
    impact = data?.[0] ?? null;
  }

  return (
    <>
      <PageTitle title={v.data.name_en || v.data.code}>
        <Link href={live ? `/admin/schemes/${v.scheme_id}` : "/admin/schemes"} className="text-sm text-blue-700 underline">
          {live ? "Live version and history" : "All schemes"}
        </Link>
      </PageTitle>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${VERSION_COLOR[v.status]}`}>
          {VERSION_LABEL[v.status]}
        </span>
        <span>Version {v.version_no}</span>
        <span className="text-gray-600">
          by {v.author?.full_name ?? "seed data"} · {dateIST(v.updated_at, true)}
        </span>
        <span className="text-gray-600">“{v.change_note}”{v.source ? ` · ${v.source}` : ""}</span>
      </div>

      {v.status === "sent_back" && v.review_note && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          Sent back by {v.reviewer?.full_name ?? "the owner"}: {v.review_note}
        </div>
      )}
      {open && stale && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
          The live scheme changed after this draft was started, so it cannot be approved. Discard it and start a new
          draft from the live version.
        </div>
      )}

      {v.status === "in_review" && (
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title={liveData ? "What changes" : "New scheme"}>
              <ChangeList before={liveData} after={v.data} fields={fields} />
            </Card>
          </div>
          <Card title="Effect on saved families">
            {impact ? (
              <p className="text-sm">
                <span className="text-2xl font-bold text-green-700">{impact.newly_eligible}</span> people newly eligible
                <br />
                <span className="text-2xl font-bold text-red-700">{impact.no_longer_eligible}</span> people no longer eligible
                <br />
                <span className="text-gray-500">out of {impact.people_checked} checked</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500">Not available.</p>
            )}
            {owner ? (
              <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                <ActionForm action={reviewVersion} submitLabel="Approve and publish">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="scheme_id" value={v.scheme_id} />
                  <input type="hidden" name="decision" value="approve" />
                  <Field label="Note (optional)">
                    <input name="review_note" className={inputClass} />
                  </Field>
                </ActionForm>
                <ActionForm action={reviewVersion} submitLabel="Send back" variant="danger">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="scheme_id" value={v.scheme_id} />
                  <input type="hidden" name="decision" value="send_back" />
                  <Field label="What needs fixing *">
                    <input name="review_note" required className={inputClass} />
                  </Field>
                </ActionForm>
              </div>
            ) : (
              <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-600">Waiting for the owner to approve.</p>
            )}
          </Card>
        </div>
      )}

      {canEdit ? (
        <>
          <SchemeEditor
            versionId={v.id}
            initial={v.data}
            note={v.change_note}
            source={v.source}
            fields={fieldRows ?? []}
            services={services ?? []}
            save={saveDraft}
          />
          <div className="mt-6">
            <ActionForm action={discardDraft} submitLabel="Discard this draft" variant="danger">
              <input type="hidden" name="id" value={v.id} />
            </ActionForm>
          </div>
        </>
      ) : (
        <SchemeSummary data={v.data} fields={fields} />
      )}
    </>
  );
}
