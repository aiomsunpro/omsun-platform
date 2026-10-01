import { notFound } from "next/navigation";
import { can, requireStaff } from "@/lib/auth";
import { dateIST, NEXT_STATUSES, rupees, STATUS_LABEL } from "@/lib/format";
import type { Payment, RequestDocument, RequestStatus, ServiceRequest } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, PageTitle, StatusBadge } from "@/components/ui";
import { assignRequest, changeStatus, recordPayment, uploadDocument, verifyDocument } from "../actions";

type Detail = ServiceRequest & {
  customers: { full_name: string; mobile: string | null; village: string | null; taluka: string | null } | null;
  services: { name_en: string; code: string; processing_days: number | null } | null;
  retailers: { business_name: string; mobile: string; village: string | null } | null;
  assignee: { full_name: string | null; email: string | null } | null;
};

type History = {
  id: number;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  note: string | null;
  created_at: string;
  changer: { full_name: string | null; email: string | null } | null;
};

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();

  const { data: r } = await supabase
    .from("service_requests")
    .select(
      "*, customers(full_name, mobile, village, taluka), services(name_en, code, processing_days), retailers(business_name, mobile, village), assignee:profiles!service_requests_assigned_to_fkey(full_name, email)",
    )
    .eq("id", id)
    .maybeSingle<Detail>();
  if (!r) notFound();

  const [{ data: docs }, { data: history }, { data: payments }, { data: requiredDocs }] = await Promise.all([
    supabase.from("request_documents").select("*").eq("request_id", id).order("created_at").returns<RequestDocument[]>(),
    supabase
      .from("request_status_history")
      .select("id, from_status, to_status, note, created_at, changer:profiles!request_status_history_changed_by_fkey(full_name, email)")
      .eq("request_id", id)
      .order("id")
      .returns<History[]>(),
    supabase.from("payments").select("*").eq("request_id", id).order("created_at").returns<Payment[]>(),
    supabase.from("service_required_documents").select("name_en, is_mandatory").eq("service_id", r.service_id).order("sort_order"),
  ]);

  const links = new Map<string, string>();
  for (const d of docs ?? []) {
    const { data } = await supabase.storage.from("request-documents").createSignedUrl(d.storage_path, 600);
    if (data?.signedUrl) links.set(d.id, data.signedUrl);
  }

  const isWorker = can(profile, "owner", "manager") || r.assigned_to === profile.id;
  const nextStatuses = NEXT_STATUSES[r.status].filter(
    (s) => !(profile.role === "service_executive" && s === "cancelled"),
  );
  const staff = can(profile, "owner", "manager")
    ? (
        await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("role", ["service_executive", "manager", "owner"])
          .eq("is_active", true)
          .order("full_name")
      ).data
    : null;

  return (
    <>
      <PageTitle title={r.request_number}>
        <StatusBadge status={r.status} />
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Request">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Item label="Service">{r.services?.name_en} ({r.services?.code})</Item>
              <Item label="Expected time">{r.services?.processing_days ? `${r.services.processing_days} days` : "—"}</Item>
              <Item label="Customer">
                {r.customers?.full_name} · {r.customers?.mobile ?? "no mobile"}
                <div className="text-gray-500">{[r.customers?.village, r.customers?.taluka].filter(Boolean).join(", ")}</div>
              </Item>
              <Item label="Came from">
                {r.channel === "walk_in"
                  ? `Walk-in, token #${r.token_number} on ${r.token_date}`
                  : `${r.retailers?.business_name} (${r.retailers?.mobile})`}
              </Item>
              <Item label="Assigned to">{r.assignee?.full_name || r.assignee?.email || "Not assigned"}</Item>
              <Item label="Priority">{r.priority}</Item>
              <Item label="Submitted">{dateIST(r.submitted_at, true)}</Item>
              <Item label="Completed">{dateIST(r.completed_at, true)}</Item>
              {r.remarks && <Item label="Remarks">{r.remarks}</Item>}
            </dl>
          </Card>

          <Card title="Documents">
            {requiredDocs && requiredDocs.length > 0 && (
              <p className="mb-3 text-sm text-gray-600">
                Needed: {requiredDocs.map((d) => d.name_en + (d.is_mandatory ? "" : " (optional)")).join(", ")}
              </p>
            )}
            <ul className="divide-y divide-gray-100 text-sm">
              {(docs ?? []).map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${d.kind === "output" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                      {d.kind === "output" ? "Completed doc" : "Customer doc"}
                    </span>
                    {links.get(d.id) ? (
                      <a href={links.get(d.id)} target="_blank" rel="noreferrer" className="text-blue-700 underline">{d.document_name}</a>
                    ) : (
                      d.document_name
                    )}
                    <span className="ml-2 text-xs text-gray-500">{d.verification}</span>
                  </span>
                  {isWorker && d.kind === "input" && d.verification === "pending" && (
                    <div className="flex gap-2">
                      <ActionForm action={verifyDocument} submitLabel="Verified" variant="secondary" className="">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="doc_id" value={d.id} />
                        <input type="hidden" name="verification" value="verified" />
                      </ActionForm>
                      <ActionForm action={verifyDocument} submitLabel="Not OK" variant="danger" className="">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="doc_id" value={d.id} />
                        <input type="hidden" name="verification" value="rejected" />
                      </ActionForm>
                    </div>
                  )}
                </li>
              ))}
              {(!docs || docs.length === 0) && <li className="py-2 text-gray-500">No documents yet.</li>}
            </ul>
            {isWorker && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <ActionForm action={uploadDocument} submitLabel="Upload">
                  <input type="hidden" name="id" value={r.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Type">
                      <select name="kind" className={inputClass}>
                        <option value="input">Customer document</option>
                        <option value="output">Completed document</option>
                      </select>
                    </Field>
                    <Field label="Name">
                      <input name="document_name" placeholder="e.g. Aadhaar card" className={inputClass} />
                    </Field>
                    <Field label="File (PDF or photo, max 10 MB)">
                      <input name="file" type="file" accept="application/pdf,image/*" required className="text-sm" />
                    </Field>
                  </div>
                </ActionForm>
              </div>
            )}
          </Card>

          <Card title="History">
            <ol className="space-y-3 text-sm">
              {(history ?? []).map((h) => (
                <li key={h.id} className="border-l-2 border-blue-200 pl-3">
                  <p>
                    <span className="font-medium">{STATUS_LABEL[h.to_status]}</span>
                    <span className="text-gray-500"> · {h.changer?.full_name || h.changer?.email || "Retailer / system"} · {dateIST(h.created_at, true)}</span>
                  </p>
                  {h.note && <p className="text-gray-700">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          {isWorker && nextStatuses.length > 0 && (
            <Card title="Update status">
              <ActionForm action={changeStatus} submitLabel="Update">
                <input type="hidden" name="id" value={r.id} />
                <Field label="New status">
                  <select name="status" required className={inputClass} defaultValue="">
                    <option value="" disabled>Choose</option>
                    {nextStatuses.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Note (needed for rejected, documents required, cancelled)">
                  <textarea name="note" rows={2} className={inputClass} />
                </Field>
              </ActionForm>
            </Card>
          )}

          {staff && !["completed", "rejected", "cancelled"].includes(r.status) && (
            <Card title="Assign">
              <ActionForm action={assignRequest} submitLabel="Save">
                <input type="hidden" name="id" value={r.id} />
                <select name="assigned_to" defaultValue={r.assigned_to ?? ""} className={inputClass}>
                  <option value="">Not assigned</option>
                  {staff.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                  ))}
                </select>
              </ActionForm>
            </Card>
          )}

          <Card title="Money">
            <dl className="space-y-1 text-sm">
              <Money label="Govt fee" value={r.govt_fee} />
              <Money label="Service charge" value={r.service_charge} />
              <Money label="Customer price" value={r.customer_price} strong />
              {r.retailer_id && <Money label="Retailer commission" value={r.retailer_commission} />}
              <Money label={r.retailer_id ? "Due to OMSUN from retailer" : "Due to OMSUN"} value={r.amount_due} strong />
              <Money label="Paid so far" value={r.amount_paid} />
            </dl>
            <p className="mt-2 text-sm">
              Payment: <span className="font-medium">{r.payment_status}</span>
            </p>
            <ul className="mt-3 divide-y divide-gray-100 text-sm">
              {(payments ?? []).map((p) => (
                <li key={p.id} className="py-1.5">
                  {p.receipt_number} · {rupees(p.amount)} {p.method}
                  <span className={`ml-1 text-xs ${p.status === "reversed" ? "text-red-700" : "text-gray-500"}`}>{p.status}</span>
                </li>
              ))}
            </ul>
            {can(profile, "owner", "manager", "accountant", "service_executive") && r.status !== "cancelled" && r.status !== "rejected" && r.payment_status !== "paid" && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <ActionForm action={recordPayment} submitLabel="Record payment">
                  <input type="hidden" name="id" value={r.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Amount ₹">
                      <input name="amount" type="number" step="0.01" min="1" defaultValue={Math.max(r.amount_due - r.amount_paid, 0) || ""} required className={inputClass} />
                    </Field>
                    <Field label="Method">
                      <select name="method" className={inputClass}>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="bank">Bank</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="UPI / bank reference">
                    <input name="reference" className={inputClass} />
                  </Field>
                  <input type="hidden" name="payer_type" value={r.retailer_id ? "retailer" : "customer"} />
                </ActionForm>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Money({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd className={strong ? "font-semibold" : ""}>{rupees(value)}</dd>
    </div>
  );
}
