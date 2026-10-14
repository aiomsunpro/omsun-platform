import { supabase } from "./supabase";
import type { RequiredDocument, Service, ServiceCategory, ServiceQuestion } from "./types";
import { must } from "./use-load";

export type Catalogue = {
  categories: ServiceCategory[];
  services: Service[];
  docs: RequiredDocument[];
  questions: ServiceQuestion[];
};

/** Active services offered to retailers, with their categories, document checklists and questions. */
export async function loadCatalogue(): Promise<Catalogue> {
  const [cats, services, docs, questions] = await Promise.all([
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
    supabase.from("service_questions").select("*").order("sort_order"),
  ]);
  return {
    categories: must(cats) as ServiceCategory[],
    services: must(services) as Service[],
    docs: must(docs) as RequiredDocument[],
    // An older database without questions still loads the catalogue.
    questions: (questions.data ?? []) as ServiceQuestion[],
  };
}
