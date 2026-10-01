import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import type { Service, ServiceCategory } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, PageTitle } from "@/components/ui";
import { addRequiredDocument, removeRequiredDocument, updateService } from "../actions";
import { ServiceFields } from "../service-form";

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff(["owner", "manager"]);
  const [{ data: service }, { data: categories }, { data: docs }] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).maybeSingle<Service>(),
    supabase.from("service_categories").select("*").order("sort_order").returns<ServiceCategory[]>(),
    supabase.from("service_required_documents").select("*").eq("service_id", id).order("sort_order"),
  ]);
  if (!service) notFound();

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
      </div>
    </>
  );
}
