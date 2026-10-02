// Row shapes used by OMSUN Mitra. supabase/migrations is the source of truth.

export type Lang = "mr" | "en";

export type RequestStatus =
  | "new"
  | "assigned"
  | "documents_required"
  | "documents_received"
  | "under_process"
  | "pending"
  | "completed"
  | "rejected"
  | "cancelled";

export type RetailerStatus = "pending" | "approved" | "suspended" | "rejected";

export type Profile = {
  id: string;
  full_name: string | null;
  mobile: string | null;
  email: string | null;
  role: string;
  preferred_language: Lang;
  is_active: boolean;
};

export type Retailer = {
  id: string;
  profile_id: string | null;
  business_name: string;
  owner_name: string;
  mobile: string;
  village: string | null;
  taluka: string | null;
  district: string | null;
  pincode: string | null;
  address: string | null;
  business_type: string | null;
  status: RetailerStatus;
  joined_on: string | null;
};

export type ServiceCategory = {
  id: string;
  name_en: string;
  name_mr: string;
  sort_order: number;
};

export type Service = {
  id: string;
  category_id: string;
  code: string;
  name_en: string;
  name_mr: string;
  description_en: string | null;
  description_mr: string | null;
  instructions_en: string | null;
  instructions_mr: string | null;
  govt_fee: number;
  service_charge: number;
  customer_price: number;
  retailer_commission: number;
  processing_days: number | null;
};

export type RequiredDocument = {
  id: string;
  service_id: string;
  name_en: string;
  name_mr: string;
  is_mandatory: boolean;
  notes: string | null;
  sort_order: number;
};

export type Customer = {
  id: string;
  full_name: string;
  mobile: string | null;
  village: string | null;
  taluka: string | null;
  district: string | null;
  created_at: string;
};

export type ServiceRequest = {
  id: string;
  request_number: string;
  customer_id: string;
  service_id: string;
  status: RequestStatus;
  last_status_note: string | null;
  customer_price: number;
  retailer_commission: number;
  amount_due: number;
  amount_paid: number;
  payment_status: "unpaid" | "partial" | "paid";
  remarks: string | null;
  submitted_at: string;
  completed_at: string | null;
  updated_at: string;
  customers?: { full_name: string; mobile: string | null } | null;
  services?: { name_en: string; name_mr: string } | null;
};

export type RequestDocument = {
  id: string;
  kind: "input" | "output";
  document_name: string;
  storage_path: string;
  mime_type: string | null;
  verification: "pending" | "verified" | "rejected";
  verification_note: string | null;
  created_at: string;
};

export type StatusHistory = {
  id: number;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  note: string | null;
  created_at: string;
};

export type Commission = {
  id: string;
  request_id: string;
  amount: number;
  status: "on_hold" | "earned" | "settled" | "cancelled";
  earned_at: string | null;
  created_at: string;
  service_requests?: { request_number: string; customers?: { full_name: string } | null } | null;
};

export type Settlement = {
  id: string;
  period_start: string;
  period_end: string;
  request_count: number;
  gross_amount: number;
  commission_amount: number;
  amount_due: number;
  amount_received: number;
  balance: number;
  status: "draft" | "finalized";
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  request_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type Announcement = {
  id: string;
  title_en: string;
  title_mr: string | null;
  body_en: string | null;
  body_mr: string | null;
  created_at: string;
};
