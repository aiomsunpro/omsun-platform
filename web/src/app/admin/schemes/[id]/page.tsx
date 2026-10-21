import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import { VERSION_COLOR, VERSION_LABEL, type ProfileField, type Scheme, type SchemeVersion } from "@/lib/yojana";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, PageTitle, Table } from "@/components/ui";
import { restoreVersion, startDraft } from "../actions";
import { SchemeSummary } from "../scheme-summary";

type Row = SchemeVersion & {
  author: { full_name: string | null } | null;
  reviewer: { full_name: string | null } | null;
};

export default async function SchemePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  const [{ data: scheme }, { data: versions }, { data: fieldRows }] = await Promise.all([
    supabase.from("schemes").select("*").eq("id", id).maybeSingle<Scheme>(),
    supabase
      .from("scheme_versions")
      .select(
        "*, author:profiles!scheme_versions_created_by_fkey(full_name), reviewer:profiles!scheme_versions_reviewed_by_fkey(full_name)",
      )
      .eq("scheme_id", id)
      .order("version_no", { ascending: false })
      .returns<Row[]>(),
    supabase.from("profile_fields").select("*").returns<ProfileField[]>(),
  ]);
  if (!scheme) notFound();
  const current = versions?.find((v) => v.id === scheme.current_version_id);
  if (!current) notFound();
  const fields = new Map((fieldRows ?? []).map((f) => [f.key, f]));
  const editor = can(profile, "owner", "manager");
  const openDraft = versions?.find((v) => ["draft", "sent_back", "in_review"].includes(v.status));

  return (
    <>
      <PageTitle title={scheme.name_en}>
        <Link href="/admin/schemes" className="text-sm text-blue-700 underline">All schemes</Link>
      </PageTitle>

      {editor && (
        <div className="mb-6">
          {openDraft ? (
            <p className="text-sm">
              A change is already open:{" "}
              <Link href={`/admin/schemes/drafts/${openDraft.id}`} className="font-medium text-blue-700 underline">
                version {openDraft.version_no}, {VERSION_LABEL[openDraft.status].toLowerCase()}
              </Link>
              .
            </p>
          ) : (
            <Card title="Change this scheme">
              <ActionForm action={startDraft} submitLabel="Start a draft" className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="scheme_id" value={scheme.id} />
                <div className="min-w-64 flex-1">
                  <Field label="What are you changing and why? *">
                    <input name="change_note" required minLength={3} placeholder="New GR raises the income limit" className={inputClass} />
                  </Field>
                </div>
                <div className="min-w-48">
                  <Field label="Source">
                    <input name="source" placeholder="GR number or link" className={inputClass} />
                  </Field>
                </div>
              </ActionForm>
            </Card>
          )}
        </div>
      )}

      <SchemeSummary data={current.data} fields={fields} />

      <h2 className="mb-2 mt-8 font-semibold text-blue-950">Version history</h2>
      <Table head={["Version", "Change", "By", "Approved", "Status", ""]}>
        {versions?.map((v) => (
          <tr key={v.id} className="align-top">
            <td className="px-4 py-3">
              <Link href={`/admin/schemes/drafts/${v.id}`} className="text-blue-700 underline">{v.version_no}</Link>
              {v.id === scheme.current_version_id && <div className="text-xs font-medium text-green-700">Live</div>}
            </td>
            <td className="px-4 py-3">
              {v.change_note}
              {v.source && <div className="text-xs text-gray-500">{v.source}</div>}
              {v.review_note && <div className="text-xs text-gray-500">Owner: {v.review_note}</div>}
            </td>
            <td className="px-4 py-3">{v.author?.full_name ?? "Seed data"}</td>
            <td className="px-4 py-3">
              {v.reviewed_at ? `${v.reviewer?.full_name ?? ""} · ${dateIST(v.reviewed_at, true)}` : "—"}
            </td>
            <td className="px-4 py-3">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${VERSION_COLOR[v.status]}`}>
                {VERSION_LABEL[v.status]}
              </span>
            </td>
            <td className="px-4 py-3">
              {editor && !openDraft && v.status === "published" && v.id !== scheme.current_version_id && (
                <ActionForm action={restoreVersion} submitLabel="Go back to this" variant="secondary" className="space-y-2">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="scheme_id" value={scheme.id} />
                  <input name="change_note" required minLength={3} placeholder="Why?" className={inputClass} />
                </ActionForm>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <p className="mt-2 text-xs text-gray-500">
        Going back to an old version makes a new draft from it. It still needs the owner&apos;s approval.
      </p>
    </>
  );
}
