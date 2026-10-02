import { supabase } from "./supabase";
import type { RequiredDocument, Service, ServiceCategory } from "./types";
import { must } from "./use-load";

export type Catalogue = {
  categories: ServiceCategory[];
  services: Service[];
  docs: RequiredDocument[];
};

/** Active services offered to retailers, with their categories and document checklists. */
export async function loadCatalogue(): Promise<Catalogue> {
  const [cats, services, docs] = await Promise.all([
    supabase.from("service_categories").select("id, name_en, name_mr, sort_order").eq("is_active", true).order("sort_order"),
    supabase
      .from("services")
      .select(
        "id, category_id, code, name_en, name_mr, description_en, description_mr, instructions_en, instructions_mr, govt_fee, service_charge, customer_price, retailer_commission, processing_days",
      )
      .eq("is_active", true)
      .eq("available_to_retailers", true)
      .order("name_en"),
    supabase.from("service_required_documents").select("*").order("sort_order"),
  ]);
  return {
    categories: must(cats) as ServiceCategory[],
    services: must(services) as Service[],
    docs: must(docs) as RequiredDocument[],
  };
}
