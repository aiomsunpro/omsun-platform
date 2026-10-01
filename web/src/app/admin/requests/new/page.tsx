import { requireStaff } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, PageTitle } from "@/components/ui";
import { createWalkIn } from "../actions";

export default async function NewWalkIn() {
  const { supabase, profile } = await requireStaff(["owner", "manager", "service_executive"]);
  const { data: services } = await supabase
    .from("services")
    .select("id, code, name_en, customer_price")
    .eq("is_active", true)
    .order("name_en");
  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["service_executive", "manager", "owner"])
    .eq("is_active", true)
    .order("full_name");

  return (
    <>
      <PageTitle title="New walk-in request" />
      <div className="max-w-2xl">
        <Card>
          <ActionForm action={createWalkIn} submitLabel="Create request and token">
            <p className="text-sm text-gray-600">
              If a customer with this mobile number already exists, their record is reused.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer name *">
                <input name="full_name" required className={inputClass} />
              </Field>
              <Field label="Mobile (10 digits)">
                <input name="mobile" inputMode="numeric" className={inputClass} />
              </Field>
              <Field label="Village">
                <input name="village" className={inputClass} />
              </Field>
              <Field label="Taluka">
                <input name="taluka" defaultValue="Omerga" className={inputClass} />
              </Field>
            </div>
            <Field label="Service *">
              <select name="service_id" required className={inputClass} defaultValue="">
                <option value="" disabled>Choose a service</option>
                {services?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name_en} ({s.code}) · {rupees(s.customer_price)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.role !== "service_executive" && (
                <Field label="Assign to">
                  <select name="assigned_to" className={inputClass} defaultValue="">
                    <option value="">Assign later</option>
                    {staff?.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Priority">
                <select name="priority" className={inputClass}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </Field>
            </div>
            <Field label="Remarks">
              <textarea name="remarks" rows={2} className={inputClass} />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
