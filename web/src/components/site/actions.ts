"use server";

import { createClient } from "@/lib/supabase/server";

export type EnquiryResult = { ok: true } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  invalid_name: "कृपया तुमचे पूर्ण नाव टाका.",
  invalid_mobile: "कृपया 10 अंकी मोबाईल नंबर टाका.",
  invalid_place: "कृपया गाव आणि जिल्हा टाका.",
  too_long: "माहिती खूप मोठी आहे, कृपया थोडक्यात लिहा.",
  too_many_enquiries: "सध्या खूप अर्ज येत आहेत. कृपया थोड्या वेळाने प्रयत्न करा किंवा आम्हाला कॉल करा.",
};

/** Saves the website's callback form as an enquiry in the admin app. */
export async function submitEnquiry(form: FormData): Promise<EnquiryResult> {
  // Hidden field that people never fill in; bots usually do.
  if (String(form.get("company") ?? "") !== "") return { ok: true };

  const text = (k: string) => String(form.get(k) ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_website_enquiry", {
    p_full_name: text("full_name"),
    p_mobile: text("mobile"),
    p_village: text("village"),
    p_district: text("district"),
    p_business_type: text("business_type"),
    p_interest: text("interest"),
  });
  if (!error) return { ok: true };
  const known = Object.keys(MESSAGES).find((k) => error.message.includes(k));
  return {
    ok: false,
    message: known ? MESSAGES[known] : "अर्ज पाठवता आला नाही. कृपया पुन्हा प्रयत्न करा किंवा आम्हाला कॉल करा.",
  };
}

export type TrackResult =
  | { ok: true; requestNumber: string; serviceMr: string; serviceEn: string; status: string; submittedAt: string; updatedAt: string }
  | { ok: false; message: string };

/** Website status tracker: request number and the customer's mobile must both match. */
export async function trackRequest(requestNumber: string, mobile: string): Promise<TrackResult> {
  if (!requestNumber.trim()) return { ok: false, message: "कृपया अर्ज क्रमांक टाका (पावतीवर आहे)." };
  if (mobile.replace(/\D/g, "").length < 10) return { ok: false, message: "कृपया 10 अंकी मोबाईल नंबर टाका." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("track_request", { p_request_number: requestNumber, p_mobile: mobile });
  if (error) return { ok: false, message: "स्थिती तपासता आली नाही. कृपया पुन्हा प्रयत्न करा किंवा आम्हाला कॉल करा." };
  const row = (data as { request_number: string; service_en: string; service_mr: string; status: string; submitted_at: string; updated_at: string }[] | null)?.[0];
  if (!row) return { ok: false, message: "हा अर्ज क्रमांक आणि मोबाईल नंबर जुळत नाहीत. कृपया पावती तपासा." };
  return {
    ok: true,
    requestNumber: row.request_number,
    serviceMr: row.service_mr,
    serviceEn: row.service_en,
    status: row.status,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}
