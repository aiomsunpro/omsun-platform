import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import type { Service, ServiceCategory } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, PageTitle, Table } from "@/components/ui";
import { dateIST, rupees } from "@/lib/format";
import { addQuestion, addRequiredDocument, removeQuestion, removeRequiredDocument, updateService } from "../actions";
import { ServiceFields } from "../service-form";

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff(["owner", "manager"]);
  const [{ data: service }, { data: categories }, { data: docs }, { data: questions }] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).maybeSingle<Service>(),
    supabase.from("service_categories").select("*").order("sort_order").returns<ServiceCategory[]>(),
    supabase.from("service_required_documents").select("*").eq("service_id", id).order("sort_order"),
    supabase.from("service_questions").select("*").eq("service_id", id).order("sort_order"),
  ]);
  if (!service) notFound();
  // Price history comes from the audit log, which only the owner can read.
  const { data: history } =
    profile.role === "owner"
      ? await supabase.from("service_price_history").select("*").eq("service_id", id).order("changed_at", { ascending: false }).limit(50)
      : { data: null };

  return (
    <>
      <PageTitle title={service.name_en} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Details">
            <ActionForm action={updateService} submitLabel="Save changes">
              <input type="hidden" name="id" value={service.id} />
              <ServiceFields categories={categories ?? []} service={service} canPrice={profile.role === "owner"} />
            </ActionForm>
          </Card>
        </div>
        <div className="space-y-6">
        <Card title="Documents the customer must give">
          <ul className="mb-4 divide-y divide-gray-100 text-sm">
            {docs?.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {d.name_en} · {d.name_mr}
                  {!d.is_mandatory && <span className="text-xs text-gray-500"> (optional)</span>}
                </span>
                <ActionForm action={removeRequiredDocument} submitLabel="Remove" variant="danger" className="">
                  <input type="hidden" name="service_id" value={service.id} />
                  <input type="hidden" name="doc_id" value={d.id} />
                </ActionForm>
              </li>
            ))}
            {(!docs || docs.length === 0) && <li className="py-2 text-gray-500">None listed yet.</li>}
          </ul>
          <ActionForm action={addRequiredDocument} submitLabel="Add document">
            <input type="hidden" name="service_id" value={service.id} />
            <Field label="Name (English)">
              <input name="name_en" required placeholder="Aadhaar card" className={inputClass} />
            </Field>
            <Field label="नाव (मराठी)">
              <input name="name_mr" required placeholder="आधार कार्ड" className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_mandatory" defaultChecked /> Required
            </label>
            <input type="hidden" name="sort_order" value={(docs?.length ?? 0) + 1} />
          </ActionForm>
        </Card>
        <Card title="Questions the customer must answer">
          <p className="mb-3 text-sm text-gray-600">
            Details typed in as text, like father&apos;s name, date of birth or an old certificate number.
          </p>
          <ul className="mb-4 divide-y divide-gray-100 text-sm">
            {questions?.map((q) => (
              <li key={q.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  {q.question_en} · {q.question_mr}
                  {!q.is_mandatory && <span className="text-xs text-gray-500"> (optional)</span>}
                </span>
                <ActionForm action={removeQuestion} submitLabel="Remove" variant="danger" className="">
                  <input type="hidden" name="service_id" value={service.id} />
                  <input type="hidden" name="question_id" value={q.id} />
                </ActionForm>
              </li>
            ))}
            {(!questions || questions.length === 0) && <li className="py-2 text-gray-500">None listed yet.</li>}
          </ul>
          <ActionForm action={addQuestion} submitLabel="Add question">
            <input type="hidden" name="service_id" value={service.id} />
            <Field label="Question (English)">
              <input name="question_en" required maxLength={200} placeholder="Father's full name" className={inputClass} />
            </Field>
            <Field label="प्रश्न (मराठी)">
              <input name="question_mr" required maxLength={200} placeholder="वडिलांचे पूर्ण नाव" className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_mandatory" defaultChecked /> Required
            </label>
            <input type="hidden" name="sort_order" value={(questions?.length ?? 0) + 1} />
          </ActionForm>
        </Card>
        </div>
      </div>
      {history && history.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-2 font-semibold text-blue-950">Price history</h2>
          <Table head={["When", "Who", "Govt fee", "Service charge", "Commission", "Cap"]}>
            {history.map((h, i) => (
              <tr key={i}>
                <td className="px-4 py-3">{dateIST(h.changed_at, true)}</td>
                <td className="px-4 py-3">{h.changed_by_name ?? "—"}</td>
                <td className="px-4 py-3"><Change before={h.old_govt_fee} after={h.new_govt_fee} /></td>
                <td className="px-4 py-3"><Change before={h.old_service_charge} after={h.new_service_charge} /></td>
                <td className="px-4 py-3"><Change before={h.old_commission} after={h.new_commission} /></td>
                <td className="px-4 py-3"><Change before={h.old_price_cap} after={h.new_price_cap} /></td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </>
  );
}

function Change({ before, after }: { before: number | null; after: number | null }) {
  const show = (v: number | null) => (v === null ? "—" : rupees(v));
  if (before === after) return <span className="text-gray-500">{show(after)}</span>;
  return (
    <span>
      {before !== null && <span className="text-red-700 line-through">{show(before)}</span>} <span className="font-medium text-green-800">{show(after)}</span>
    </span>
  );
}
