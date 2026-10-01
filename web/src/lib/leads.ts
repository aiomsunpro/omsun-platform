export type LeadStage =
  | "new_lead"
  | "contacted"
  | "interested"
  | "information_sent"
  | "follow_up"
  | "meeting_scheduled"
  | "visit_completed"
  | "payment_pending"
  | "converted"
  | "not_interested"
  | "lost";

export type LeadType = "retailer" | "enquiry";

export const STAGE_LABEL: Record<LeadStage, string> = {
  new_lead: "New",
  contacted: "Contacted",
  interested: "Interested",
  information_sent: "Information sent",
  follow_up: "Follow-up",
  meeting_scheduled: "Meeting scheduled",
  visit_completed: "Visit completed",
  payment_pending: "Payment pending",
  converted: "Converted",
  not_interested: "Not interested",
  lost: "Lost",
};

export const CLOSED_STAGES: LeadStage[] = ["converted", "not_interested", "lost"];
export const OPEN_STAGES = (Object.keys(STAGE_LABEL) as LeadStage[]).filter((s) => !CLOSED_STAGES.includes(s));

export const STAGE_COLOR: Partial<Record<LeadStage, string>> = {
  new_lead: "bg-blue-100 text-blue-800",
  interested: "bg-green-100 text-green-800",
  payment_pending: "bg-yellow-100 text-yellow-900",
  converted: "bg-green-600 text-white",
  not_interested: "bg-gray-200 text-gray-700",
  lost: "bg-gray-200 text-gray-700",
};

export const SOURCES = ["Walk-in", "Phone call", "WhatsApp", "Village camp", "Referral", "Website", "Facebook / Instagram", "Field visit"];

export const ACTIVITY_LABEL = { call: "Call", whatsapp: "WhatsApp", visit: "Visit", meeting: "Meeting", note: "Note" };
export const OUTCOME_LABEL = {
  not_connected: "Not connected",
  connected: "Connected",
  conversation: "Good conversation",
  interested: "Interested",
  not_interested: "Not interested",
  follow_up: "Asked to call later",
  payment: "Payment done",
};

export type Lead = {
  id: string;
  lead_type: LeadType;
  full_name: string;
  mobile: string;
  village: string | null;
  taluka: string | null;
  district: string | null;
  business_type: string | null;
  source: string | null;
  interest: string | null;
  stage: LeadStage;
  assigned_to: string | null;
  service_id: string | null;
  last_contact_at: string | null;
  next_follow_up_on: string | null;
  notes: string | null;
  created_at: string;
};
