// Row shapes used by the admin app. The database (supabase/migrations) is the source of truth.

export type AppRole =
  | "owner"
  | "manager"
  | "accountant"
  | "sales_executive"
  | "service_executive"
  | "retailer"
  | "customer";

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

export type Profile = {
  id: string;
  full_name: string | null;
  mobile: string | null;
  email: string | null;
  role: AppRole;
  is_active: boolean;
};

export type ServiceCategory = {
  id: string;
  name_en: string;
  name_mr: string;
  is_active: boolean;
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
  available_to_retailers: boolean;
  is_active: boolean;
};

export type Customer = {
  id: string;
  full_name: string;
  mobile: string | null;
  village: string | null;
  taluka: string | null;
  district: string | null;
  retailer_id: string | null;
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
  business_type: string | null;
  status: "pending" | "approved" | "suspended" | "rejected";
  joining_fee_paid: boolean;
  joined_on: string | null;
  created_at: string;
};

export type ServiceRequest = {
  id: string;
  request_number: string;
  channel: "retailer" | "walk_in" | "website";
  token_date: string | null;
  token_number: number | null;
  customer_id: string;
  service_id: string;
  retailer_id: string | null;
  assigned_to: string | null;
  status: RequestStatus;
  last_status_note: string | null;
  priority: "normal" | "urgent";
  govt_fee: number;
  service_charge: number;
  customer_price: number;
  retailer_commission: number;
  amount_due: number;
  amount_paid: number;
  payment_status: "unpaid" | "partial" | "paid";
  remarks: string | null;
  submitted_at: string;
  completed_at: string | null;
};

export type RequestDocument = {
  id: string;
  request_id: string;
  kind: "input" | "output";
  document_name: string;
  storage_path: string;
  verification: "pending" | "verified" | "rejected";
  created_at: string;
};

export type Payment = {
  id: string;
  receipt_number: string;
  purpose: "service" | "retailer_dues" | "joining_fee";
  request_id: string | null;
  retailer_id: string | null;
  payer_type: "customer" | "retailer";
  amount: number;
  method: "cash" | "upi" | "bank" | "other";
  reference: string | null;
  status: "recorded" | "verified" | "reversed";
  paid_on: string;
  received_by: string | null;
  reversal_reason: string | null;
  created_at: string;
};

export type ActionState = { error?: string; ok?: string } | undefined;
