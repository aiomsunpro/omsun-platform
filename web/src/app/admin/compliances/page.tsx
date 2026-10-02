import Link from "next/link";
import { can, requireStaff, STAFF_ROLES } from "@/lib/auth";
import { dateIST, rupees } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputBase, inputClass, PageTitle, Table } from "@/components/ui";
import { addCompliance, updateCompliance } from "./actions";

const STATUS: Record<string, { label: string; cls: string }> = {
  not_started: { label: "Not Started", cls: "bg-slate-200 text-slate-800" },
  in_process: { label: "In Process", cls: "bg-amber-100 text-amber-900" },
  uploaded: { label: "Uploaded", cls: "bg-blue-100 text-blue-900" },
  completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-900" },
  delivered: { label: "Delivered", cls: "bg-green-200 text-green-900" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-900" },
  refunded: { label: "Refunded", cls: "bg-purple-100 text-purple-900" },
  inactive: { label: "Inactive", cls: "bg-gray-200 text-gray-700" },
};
const PAY: Record<string, string> = { unpaid: "text-red-600", partial: "text-amber-700", paid: "text-green-700" };

type Row = {
  id: string; status: string; fee: number; amount_paid: number; payment_status: string; reference_no: string | null; notes: string | null;
  started_on: string | null; completed_on: string | null; delivered_on: string | null; assigned_to: string | null;
  customers: { full_name: string; mobile: string | null } | null; services: { name_en: string } | null;
  assignee: { full_name: string | null } | null;
};

export default async function Compliances({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase, profile } = await requireStaff(["owner", "manager", "accountant", "service_executive"]);
  const filter = (await searchParams).status ?? "open";
  const canAssign = can(profile, "owner", "manager", "accountant");

  let query = supabase
    .from("compliances")
    .select("id, status, fee, amount_paid, payment_status, reference_no, notes, started_on, completed_on, delivered_on, assigned_to, customers(full_name, mobile), services(name_en), assignee:profiles!compliances_assigned_to_fkey(full_name)")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (filter === "open") query = query.in("status", ["not_started", "in_process", "uploaded", "completed"]);
  else if (STATUS[filter]) query = query.eq("status", filter);

  const [{ data: rows }, { data: customers }, { data: services }, { data: staff }] = await Promise.all([
    query.returns<Row[]>(),
    supabase.from("customers").select("id, full_name, mobile").order("full_name").limit(500).returns<{ id: string; full_name: string; mobile: string | null }[]>(),
    supabase.from("services").select("id, name_en, service_charge").eq("is_active", true).order("name_en").returns<{ id: string; name_en: string; service_charge: number }[]>(),
    supabase.from("profiles").select("id, full_name, email").in("role", STAFF_ROLES).eq("is_active", true).order("full_name")
      .returns<{ id: string; full_name: string | null; email: string | null }[]>(),
  ]);
  const staffName = (s: { full_name: string | null; email: string | null }) => s.full_name || s.email || "Staff";
  const tabs = [["open", "Open"], ...Object.entries(STATUS).map(([k, v]) => [k, v.label]), ["all", "All"]];

  return (
    <>
      <PageTitle title="Compliances" />
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/admin/compliances?status=${k}`}
            className={`rounded-full px-3 py-1 text-sm ${filter === k ? "bg-blue-700 text-white" : "bg-white text-blue-900 border border-blue-100 hover:bg-blue-50"}`}>
            {label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {(rows ?? []).length === 0 ? (
            <Empty>No compliances here.</Empty>
          ) : (
            <Table head={["Customer & Service", "Status", "Fee / Paid", "Dates", "Assigned", "Update"]}>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.customers?.full_name ?? "—"}</div>
                    <div className="text-xs text-slate-500">{r.services?.name_en}{r.customers?.mobile ? ` · ${r.customers.mobile}` : ""}</div>
                    {r.reference_no && <div className="text-xs text-slate-500">Ref: {r.reference_no}</div>}
                    {r.notes && <div className="text-xs text-slate-500">{r.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS[r.status]?.cls}`}>{STATUS[r.status]?.label}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {rupees(r.fee)}
                    <div className={`text-xs capitalize ${PAY[r.payment_status]}`}>{r.payment_status} · {rupees(r.amount_paid)}</div>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {r.started_on && <div>Started {dateIST(r.started_on)}</div>}
                    {r.completed_on && <div>Done {dateIST(r.completed_on)}</div>}
                    {r.delivered_on && <div>Delivered {dateIST(r.delivered_on)}</div>}
                    {!r.started_on && "—"}
                  </td>
                  <td className="px-4 py-3">{r.assignee?.full_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <details>
                      <summary className="cursor-pointer text-sm text-blue-700">Update</summary>
                      <div className="mt-2 w-56">
                        <ActionForm action={updateCompliance} submitLabel="Save" variant="secondary">
                          <input type="hidden" name="id" value={r.id} />
                          <select name="status" defaultValue={r.status} className={inputClass}>
                            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <input name="amount_paid" type="number" step="0.01" min="0" defaultValue={r.amount_paid} title="Amount paid ₹" className={inputClass} />
                          <input name="reference_no" defaultValue={r.reference_no ?? ""} placeholder="Reference / application no." className={inputClass} />
                          {canAssign && (
                            <select name="assigned_to" defaultValue={r.assigned_to ?? ""} className={inputClass}>
                              <option value="">Not assigned</option>
                              {(staff ?? []).map((s) => <option key={s.id} value={s.id}>{staffName(s)}</option>)}
                            </select>
                          )}
                        </ActionForm>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <Card title="Add Compliance">
          <ActionForm action={addCompliance} submitLabel="Add compliance">
            <Field label="Customer">
              <select name="customer_id" required className={inputClass} defaultValue="">
                <option value="" disabled>Choose customer</option>
                {(customers ?? []).map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.mobile ? ` · ${c.mobile}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Service">
              <select name="service_id" required className={inputClass} defaultValue="">
                <option value="" disabled>Choose service</option>
                {(services ?? []).map((s) => <option key={s.id} value={s.id}>{s.name_en}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fee ₹">
                <input name="fee" type="number" step="0.01" min="0" className={inputClass} />
              </Field>
              <Field label="Paid ₹">
                <input name="amount_paid" type="number" step="0.01" min="0" className={inputClass} />
              </Field>
            </div>
            {canAssign && (
              <Field label="Assign To">
                <select name="assigned_to" className={inputClass} defaultValue="">
                  <option value="">Not assigned</option>
                  {(staff ?? []).map((s) => <option key={s.id} value={s.id}>{staffName(s)}</option>)}
                </select>
              </Field>
            )}
            <Field label="Reference / Application No.">
              <input name="reference_no" className={inputClass} />
            </Field>
            <Field label="Note">
              <input name="notes" placeholder="e.g. GSTR-3B every month" className={`${inputBase} w-full`} />
            </Field>
          </ActionForm>
          <p className="mt-3 text-xs text-slate-500">Customers are added in Customer Management. Start, done and delivered dates fill in by themselves when you change the status.</p>
        </Card>
      </div>
    </>
  );
}
