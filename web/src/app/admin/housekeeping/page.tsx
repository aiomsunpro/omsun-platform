import { can, requireStaff } from "@/lib/auth";
import { addDays, todayIST } from "@/lib/dates";
import { dateIST, rupees } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputBase, inputClass, PageTitle, Table } from "@/components/ui";
import { addHousekeeping, addWaterBill, deleteHousekeeping, deleteWaterBill, markWaterBillPaid } from "./actions";

type Log = { id: string; staff_name: string; work_date: string; is_present: boolean; work_done: string | null; amount_paid: number; notes: string | null };
type Bill = { id: string; bill_month: string; vendor: string | null; amount: number; paid: boolean; paid_on: string | null; notes: string | null };

const monthLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function Housekeeping() {
  const { supabase, profile } = await requireStaff();
  const today = todayIST();
  const keeper = can(profile, "owner", "manager", "accountant");
  const owner = can(profile, "owner");

  const [{ data: logs }, { data: bills }] = await Promise.all([
    supabase.from("housekeeping_log").select("id, staff_name, work_date, is_present, work_done, amount_paid, notes")
      .gte("work_date", addDays(today, -60)).order("work_date", { ascending: false }).order("created_at", { ascending: false }).returns<Log[]>(),
    supabase.from("water_bills").select("id, bill_month, vendor, amount, paid, paid_on, notes")
      .order("bill_month", { ascending: false }).limit(24).returns<Bill[]>(),
  ]);

  const monthStart = today.slice(0, 8) + "01";
  const thisMonth = (logs ?? []).filter((l) => l.work_date >= monthStart);
  const unpaid = (bills ?? []).filter((b) => !b.paid);

  return (
    <>
      <PageTitle title="Housekeeping & Water Bills" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Days Present This Month" value={String(thisMonth.filter((l) => l.is_present).length)} />
        <Stat label="Paid To Housekeeping This Month" value={rupees(thisMonth.reduce((a, l) => a + Number(l.amount_paid), 0))} />
        <Stat label="Unpaid Water Bills" value={`${unpaid.length} · ${rupees(unpaid.reduce((a, b) => a + Number(b.amount), 0))}`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <h2 className="font-semibold text-blue-950">Housekeeping Log (Last 60 Days)</h2>
          {(logs ?? []).length === 0 ? (
            <Empty>No housekeeping entries yet.</Empty>
          ) : (
            <Table head={["Date", "Staff", "Present", "Work Done", "Paid", ""]}>
              {(logs ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{dateIST(l.work_date)}</td>
                  <td className="px-4 py-3">{l.staff_name}</td>
                  <td className="px-4 py-3">{l.is_present ? <span className="text-green-700">Present</span> : <span className="text-red-600">Absent</span>}</td>
                  <td className="px-4 py-3">
                    {l.work_done || "—"}
                    {l.notes && <div className="text-xs text-slate-500">{l.notes}</div>}
                  </td>
                  <td className="px-4 py-3">{Number(l.amount_paid) ? rupees(l.amount_paid) : ""}</td>
                  <td className="px-4 py-3">
                    {owner && (
                      <ActionForm action={deleteHousekeeping} submitLabel="Delete" variant="danger">
                        <input type="hidden" name="id" value={l.id} />
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}

          <h2 className="pt-4 font-semibold text-blue-950">Water Bills</h2>
          {(bills ?? []).length === 0 ? (
            <Empty>No water bills yet.</Empty>
          ) : (
            <Table head={["Month", "Vendor", "Amount", "Status", ""]}>
              {(bills ?? []).map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 whitespace-nowrap">{monthLabel(b.bill_month)}</td>
                  <td className="px-4 py-3">
                    {b.vendor || "—"}
                    {b.notes && <div className="text-xs text-slate-500">{b.notes}</div>}
                  </td>
                  <td className="px-4 py-3">{rupees(b.amount)}</td>
                  <td className="px-4 py-3">
                    {b.paid ? <span className="text-green-700">Paid {dateIST(b.paid_on)}</span> : <span className="font-medium text-red-600">Unpaid</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {!b.paid && keeper && (
                        <ActionForm action={markWaterBillPaid} submitLabel="Mark Paid" variant="secondary" className="flex items-center gap-2">
                          <input type="hidden" name="id" value={b.id} />
                          <input name="paid_on" type="date" defaultValue={today} className={`${inputBase} w-36`} />
                        </ActionForm>
                      )}
                      {owner && (
                        <ActionForm action={deleteWaterBill} submitLabel="Delete" variant="danger">
                          <input type="hidden" name="id" value={b.id} />
                        </ActionForm>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        {keeper && (
          <div className="space-y-6">
            <Card title="Add Housekeeping Entry">
              <ActionForm action={addHousekeeping} submitLabel="Save entry">
                <Field label="Staff Name">
                  <input name="staff_name" required maxLength={100} className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date">
                    <input name="work_date" type="date" defaultValue={today} max={today} className={inputClass} />
                  </Field>
                  <Field label="Attendance">
                    <select name="is_present" className={inputClass} defaultValue="yes">
                      <option value="yes">Present</option>
                      <option value="no">Absent</option>
                    </select>
                  </Field>
                </div>
                <Field label="Work Done">
                  <input name="work_done" placeholder="e.g. Floor, toilets, dusting" className={inputClass} />
                </Field>
                <Field label="Amount Paid ₹">
                  <input name="amount_paid" type="number" step="0.01" min="0" className={inputClass} />
                </Field>
                <Field label="Note">
                  <input name="notes" className={inputClass} />
                </Field>
              </ActionForm>
            </Card>

            <Card title="Add Water Bill">
              <ActionForm action={addWaterBill} submitLabel="Save bill">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Month">
                    <input name="bill_month" type="month" required defaultValue={today.slice(0, 7)} className={inputClass} />
                  </Field>
                  <Field label="Amount ₹">
                    <input name="amount" type="number" step="0.01" min="1" required className={inputClass} />
                  </Field>
                </div>
                <Field label="Vendor">
                  <input name="vendor" placeholder="e.g. Water jar supplier" className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Paid?">
                    <select name="paid" className={inputClass} defaultValue="no">
                      <option value="no">Not yet</option>
                      <option value="yes">Paid</option>
                    </select>
                  </Field>
                  <Field label="Paid On">
                    <input name="paid_on" type="date" defaultValue={today} className={inputClass} />
                  </Field>
                </div>
                <Field label="Note">
                  <input name="notes" className={inputClass} />
                </Field>
              </ActionForm>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-blue-950">{value}</div>
    </div>
  );
}
