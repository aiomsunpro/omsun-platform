import Link from "next/link";
import { can, requireStaff } from "@/lib/auth";
import { rupees } from "@/lib/format";
import type { Service, ServiceCategory } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputClass, PageTitle, Table } from "@/components/ui";
import { addCategory, addService, addServicesBulk } from "./actions";
import { ServiceFields } from "./service-form";

export default async function ServicesPage() {
  const { supabase, profile } = await requireStaff();
  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*").order("sort_order").order("name_en").returns<ServiceCategory[]>(),
    supabase.from("services").select("*").order("name_en").returns<Service[]>(),
  ]);
  const catName = new Map((categories ?? []).map((c) => [c.id, c.name_en]));
  const editor = can(profile, "owner", "manager");

  return (
    <>
      <PageTitle title="Service Management" />
      <p className="mb-4 text-sm text-gray-600">
        This list feeds the OMSUN Mitra app and the website. Price changes apply to new requests only.
      </p>
      {services && services.length === 0 ? (
        <Empty>No services yet.{profile.role === "owner" ? " Add the first one below." : ""}</Empty>
      ) : (
        <Table head={["Service", "Category", "Customer price", "Govt fee", "Commission", "Days", "Status"]}>
          {services?.map((s) => (
            <tr key={s.id} className="hover:bg-blue-50/50">
              <td className="px-4 py-3">
                {editor ? (
                  <Link href={`/admin/services/${s.id}`} className="font-medium text-blue-700 underline">{s.name_en}</Link>
                ) : (
                  <span className="font-medium">{s.name_en}</span>
                )}
                <div className="text-xs text-gray-500">{s.code} · {s.name_mr}</div>
              </td>
              <td className="px-4 py-3">{catName.get(s.category_id)}</td>
              <td className="px-4 py-3 font-medium">{rupees(s.customer_price)}</td>
              <td className="px-4 py-3">{rupees(s.govt_fee)}</td>
              <td className="px-4 py-3">{rupees(s.retailer_commission)}</td>
              <td className="px-4 py-3">{s.processing_days ?? "—"}</td>
              <td className="px-4 py-3">
                {s.is_active ? "Active" : <span className="text-gray-400">Off</span>}
                {!s.available_to_retailers && <div className="text-xs text-gray-500">Office only</div>}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {editor && (
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {profile.role === "owner" && (
            <div className="lg:col-span-2">
              <Card title="Add a service">
                {categories && categories.length > 0 ? (
                  <ActionForm action={addService} submitLabel="Add service">
                    <ServiceFields categories={categories} canPrice />
                  </ActionForm>
                ) : (
                  <p className="text-sm text-gray-600">Add a category first.</p>
                )}
              </Card>
            </div>
          )}
          {profile.role === "owner" && (
            <div className="lg:col-span-3">
              <Card title="Add many services at once">
                <ActionForm action={addServicesBulk} submitLabel="Add these services">
                  <p className="text-sm text-gray-600">
                    Paste one service per line, or copy the rows straight from Excel. Columns in this order: Category, Name
                    (English), Name (Marathi), Govt fee, Service charge, Commission, Days. New categories are created for you,
                    and if any line has a problem nothing is added.
                  </p>
                  <textarea
                    name="list"
                    rows={6}
                    required
                    className={`${inputClass} font-mono`}
                    placeholder={"Identity documents, New PAN card, नवीन पॅन कार्ड, 107, 93, 40, 7\nCertificates, Income certificate, उत्पन्न दाखला, 34, 66, 25, 15"}
                  />
                </ActionForm>
              </Card>
            </div>
          )}
          <Card title="Add a category">
            <ActionForm action={addCategory} submitLabel="Add category">
              <Field label="Name (English)">
                <input name="name_en" required className={inputClass} />
              </Field>
              <Field label="नाव (मराठी)">
                <input name="name_mr" required className={inputClass} />
              </Field>
              <Field label="Order">
                <input name="sort_order" type="number" defaultValue={0} className={inputClass} />
              </Field>
            </ActionForm>
            <ul className="mt-4 text-sm text-gray-600">
              {categories?.map((c) => (
                <li key={c.id}>{c.name_en} · {c.name_mr}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
