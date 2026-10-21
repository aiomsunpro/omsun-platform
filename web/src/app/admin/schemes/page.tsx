import Link from "next/link";
import { can, requireStaff } from "@/lib/auth";
import { dateIST, rupees } from "@/lib/format";
import { CATEGORIES, VERSION_COLOR, VERSION_LABEL, type Scheme, type SchemeVersion } from "@/lib/yojana";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputClass, PageTitle, Table } from "@/components/ui";
import { closeSuggestion, startDraft } from "./actions";

type Suggestion = {
  id: string;
  scheme_id: string | null;
  message: string;
  created_at: string;
  retailers: { business_name: string } | null;
  schemes: { name_en: string } | null;
};

const categoryLabel = new Map(CATEGORIES);

export default async function SchemesPage() {
  const { supabase, profile } = await requireStaff();
  const editor = can(profile, "owner", "manager");
  const [{ data: schemes }, { data: open }, { data: suggestions }] = await Promise.all([
    supabase.from("schemes").select("*").order("name_en").returns<Scheme[]>(),
    supabase
      .from("scheme_versions")
      .select("*, author:profiles!scheme_versions_created_by_fkey(full_name)")
      .in("status", ["draft", "in_review", "sent_back"])
      .order("updated_at", { ascending: false })
      .returns<(SchemeVersion & { author: { full_name: string | null } | null })[]>(),
    supabase
      .from("scheme_suggestions")
      .select("id, scheme_id, message, created_at, retailers(business_name), schemes(name_en)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .returns<Suggestion[]>(),
  ]);
  const waiting = (open ?? []).filter((v) => v.status === "in_review");
  const drafts = (open ?? []).filter((v) => v.status !== "in_review");

  return (
    <>
      <PageTitle title="Yojana Schemes" />
      <p className="mb-4 text-sm text-gray-600">
        Every scheme the OMSUN Mitra app screens families for. Changes are saved as drafts; they reach retailers only
        after the owner approves them.
      </p>

      {waiting.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 font-semibold text-blue-950">
            Waiting for owner approval <span className="text-sm font-normal text-gray-500">({waiting.length})</span>
          </h2>
          <VersionTable versions={waiting} />
        </div>
      )}

      {drafts.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 font-semibold text-blue-950">Drafts</h2>
          <VersionTable versions={drafts} />
        </div>
      )}

      <h2 className="mb-2 font-semibold text-blue-950">Live schemes</h2>
      {schemes && schemes.length === 0 ? (
        <Empty>No scheme is live yet. Check the drafts above against their GR and send them for approval.</Empty>
      ) : (
        <Table head={["Scheme", "Category", "Benefit a year", "Status", "Checked against GR", "Updated"]}>
          {schemes?.map((s) => (
            <tr key={s.id} className="hover:bg-blue-50/50">
              <td className="px-4 py-3">
                <Link href={`/admin/schemes/${s.id}`} className="font-medium text-blue-700 underline">{s.name_en}</Link>
                <div className="text-xs text-gray-500">{s.code} · {s.name_mr}</div>
              </td>
              <td className="px-4 py-3">{categoryLabel.get(s.category) ?? s.category}</td>
              <td className="px-4 py-3">{s.benefit_yearly ? rupees(s.benefit_yearly) : "—"}</td>
              <td className="px-4 py-3 capitalize">{s.status}</td>
              <td className="px-4 py-3">{dateIST(s.last_verified_on)}</td>
              <td className="px-4 py-3">{dateIST(s.published_at)}</td>
            </tr>
          ))}
        </Table>
      )}

      {editor && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card title="Field reports from retailers">
            {suggestions && suggestions.length > 0 ? (
              <ul className="divide-y divide-gray-100 text-sm">
                {suggestions.map((s) => (
                  <li key={s.id} className="py-3">
                    <p className="whitespace-pre-line">{s.message}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {s.retailers?.business_name ?? "Office"} · {s.schemes?.name_en ?? "General"} · {dateIST(s.created_at)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <ActionForm action={closeSuggestion} submitLabel="Taken up" variant="secondary" className="">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="status" value="accepted" />
                      </ActionForm>
                      <ActionForm action={closeSuggestion} submitLabel="Dismiss" variant="danger" className="">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="status" value="dismissed" />
                      </ActionForm>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No open reports.</p>
            )}
          </Card>
          <Card title="Add a new scheme">
            <ActionForm action={startDraft} submitLabel="Start draft">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Code * (like MH-LADKI-BAHIN)">
                  <input name="code" required className={inputClass} />
                </Field>
                <Field label="Level">
                  <select name="level" defaultValue="state" className={inputClass}>
                    <option value="state">Maharashtra</option>
                    <option value="central">Central</option>
                  </select>
                </Field>
                <Field label="Name (English) *">
                  <input name="name_en" required className={inputClass} />
                </Field>
                <Field label="नाव (मराठी) *">
                  <input name="name_mr" required className={inputClass} />
                </Field>
                <Field label="Category">
                  <select name="category" defaultValue="welfare" className={inputClass}>
                    {CATEGORIES.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Source (GR number or link)">
                  <input name="source" className={inputClass} />
                </Field>
              </div>
              <Field label="Why are you adding it? *">
                <input name="change_note" required minLength={3} className={inputClass} />
              </Field>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  );
}

function VersionTable({ versions }: { versions: (SchemeVersion & { author: { full_name: string | null } | null })[] }) {
  return (
    <Table head={["Scheme", "Change", "By", "Status", "Updated"]}>
      {versions.map((v) => (
        <tr key={v.id} className="hover:bg-blue-50/50">
          <td className="px-4 py-3">
            <Link href={`/admin/schemes/drafts/${v.id}`} className="font-medium text-blue-700 underline">
              {v.data.name_en || v.data.code}
            </Link>
            <div className="text-xs text-gray-500">{v.data.code} · version {v.version_no}</div>
          </td>
          <td className="px-4 py-3">{v.change_note}</td>
          <td className="px-4 py-3">{v.author?.full_name ?? "Seed data"}</td>
          <td className="px-4 py-3">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${VERSION_COLOR[v.status]}`}>
              {VERSION_LABEL[v.status]}
            </span>
          </td>
          <td className="px-4 py-3">{dateIST(v.updated_at, true)}</td>
        </tr>
      ))}
    </Table>
  );
}
