import type { AppRole, RequestStatus } from "./types";

export function rupees(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function dateIST(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  new: "New",
  assigned: "Assigned",
  documents_required: "Documents required",
  documents_received: "Documents received",
  under_process: "Under process",
  pending: "Pending (outside)",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const STATUS_COLOR: Record<RequestStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  assigned: "bg-indigo-100 text-indigo-800",
  documents_required: "bg-amber-100 text-amber-900",
  documents_received: "bg-sky-100 text-sky-800",
  under_process: "bg-yellow-100 text-yellow-900",
  pending: "bg-orange-100 text-orange-900",
  completed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-700",
};

export const ROLE_LABEL: Record<AppRole, string> = {
  owner: "Owner",
  manager: "Manager",
  accountant: "Accountant",
  sales_executive: "Sales executive",
  service_executive: "Service executive",
  retailer: "Retailer",
  customer: "Customer",
};

// Mirrors request_transition_allowed() in the database, which has the final say.
export const NEXT_STATUSES: Record<RequestStatus, RequestStatus[]> = {
  new: ["assigned", "documents_required", "rejected", "cancelled"],
  assigned: ["under_process", "documents_required", "rejected", "cancelled"],
  documents_required: ["documents_received", "rejected", "cancelled"],
  documents_received: ["under_process", "documents_required", "rejected", "cancelled"],
  under_process: ["pending", "documents_required", "completed", "rejected", "cancelled"],
  pending: ["under_process", "completed", "rejected", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};

export const OPEN_STATUSES: RequestStatus[] = [
  "new",
  "assigned",
  "documents_required",
  "documents_received",
  "under_process",
  "pending",
];
