import type { Service, ServiceCategory } from "@/lib/types";
import { Field, inputClass } from "@/components/ui";

// Shared fields for adding and editing a service. Price fields are locked for non-owners.
export function ServiceFields({
  categories,
  service,
  canPrice,
}: {
  categories: ServiceCategory[];
  service?: Service;
  canPrice: boolean;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Category *">
          <select name="category_id" required defaultValue={service?.category_id ?? ""} className={inputClass}>
            <option value="" disabled>Choose</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name_en}</option>
            ))}
          </select>
        </Field>
        <Field label="Code * (Like PAN-NEW)">
          <input name="code" required defaultValue={service?.code} className={inputClass} />
        </Field>
        <Field label="Processing days">
          <input name="processing_days" type="number" min="0" defaultValue={service?.processing_days ?? ""} className={inputClass} />
        </Field>
        <Field label="Name (English) *">
          <input name="name_en" required defaultValue={service?.name_en} className={inputClass} />
        </Field>
        <Field label="नाव (मराठी) *">
          <input name="name_mr" required defaultValue={service?.name_mr} className={inputClass} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Govt fee ₹">
          <input name="govt_fee" type="number" step="0.01" min="0" readOnly={!canPrice} defaultValue={service?.govt_fee ?? 0} className={inputClass} />
        </Field>
        <Field label="Service charge ₹">
          <input name="service_charge" type="number" step="0.01" min="0" readOnly={!canPrice} defaultValue={service?.service_charge ?? 0} className={inputClass} />
        </Field>
        <Field label="Retailer commission ₹">
          <input name="retailer_commission" type="number" step="0.01" min="0" readOnly={!canPrice} defaultValue={service?.retailer_commission ?? 0} className={inputClass} />
        </Field>
      </div>
      {!canPrice && <p className="text-xs text-gray-500">Only the owner can change prices and commission.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Description (English)">
          <textarea name="description_en" rows={2} defaultValue={service?.description_en ?? ""} className={inputClass} />
        </Field>
        <Field label="वर्णन (मराठी)">
          <textarea name="description_mr" rows={2} defaultValue={service?.description_mr ?? ""} className={inputClass} />
        </Field>
        <Field label="Instructions for retailers (English)">
          <textarea name="instructions_en" rows={2} defaultValue={service?.instructions_en ?? ""} className={inputClass} />
        </Field>
        <Field label="सूचना (मराठी)">
          <textarea name="instructions_mr" rows={2} defaultValue={service?.instructions_mr ?? ""} className={inputClass} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-6 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_active" defaultChecked={service?.is_active ?? true} /> Active
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="available_to_retailers" defaultChecked={service?.available_to_retailers ?? true} /> Offered to retailers
        </label>
      </div>
    </>
  );
}
