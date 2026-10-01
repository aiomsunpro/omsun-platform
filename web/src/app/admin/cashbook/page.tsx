import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";
import { can, requireStaff } from "@/lib/auth";
import { todayIST, validDate } from "@/lib/dates";
import { dateIST, rupees } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { DateRange, Tile } from "@/components/report-bits";
import { Card, Empty, Field, inputBase, inputClass, PageTitle, Table } from "@/components/ui";
import { addCashEntry, voidCashEntry } from "./actions";

const OUT_CATEGORIES = ["Rent", "Salary", "Electricity", "Internet & phone", "Govt fees paid", "Stationery & printing", "Travel", "Marketing", "Owner withdrawal", "Bank deposit"];
const IN_CATEGORIES = ["Opening cash", "Owner investment", "Retailer joining fee", "Other income"];

type Pay = { id: string; receipt_number: string; amount: number; method: string; paid_on: string; purpose: string; service_requests: { request_number: string } | null };
type Entry = { id: string; entry_date: string; direction: "in" | "out"; category: string; amount: number; method: string; note: string | null; is_void: boolean; void_reason: string | null; creator: { full_name: string | null } | null };

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export default async function CashBook({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { supabase, profile } = await requireStaff(["owner", "manager", "accountant"]);
  const today = todayIST();
  const sp = await searchParams;
  const from = validDate(sp.from, today);
  const to = validDate(sp.to, from > today ? from : today);

  const [{ data: pays }, { data: entries }, { data: opening }] = await Promise.all([
    supabase.from("payments").select("id, receipt_number, amount, method, paid_on, purpose, service_requests(request_number)")
      .neq("status", "reversed").gte("paid_on", from).lte("paid_on", to).order("paid_on").returns<Pay[]>(),
    supabase.from("cash_entries").select("id, entry_date, direction, category, amount, method, note, is_void, void_reason, creator:profiles!cash_entries_created_by_fkey(full_name)")
      .gte("entry_date", from).lte("entry_date", to).order("entry_date").order("created_at").returns<Entry[]>(),
    supabase.rpc("cash_in_hand_before", { p_date: from }),
  ]);

  const live = (entries ?? []).filter((e) => !e.is_void);
  const inflow = sum((pays ?? []).map((p) => Number(p.amount))) + sum(live.filter((e) => e.direction === "in").map((e) => Number(e.amount)));
  const outflow = sum(live.filter((e) => e.direction === "out").map((e) => Number(e.amount)));
  const openingCash = Number(opening ?? 0);
  const cashMovement =
    sum((pays ?? []).filter((p) => p.method === "cash").map((p) => Number(p.amount))) +
    sum(live.filter((e) => e.method === "cash").map((e) => (e.direction === "in" ? 1 : -1) * Number(e.amount)));

  const rows = [
    ...(pays ?? []).map((p) => ({
      key: "p" + p.id, date: p.paid_on, what: p.service_requests ? `Service payment · ${p.service_requests.request_number}` : `Payment · ${p.purpose.replace("_", " ")}`,
      ref: p.receipt_number, inAmt: Number(p.amount), outAmt: 0, method: p.method, by: "", entry: null as Entry | null,
    })),
    ...(entries ?? []).map((e) => ({
      key: "e" + e.id, date: e.entry_date, what: e.category + (e.note ? ` · ${e.note}` : ""), ref: "",
      inAmt: e.direction === "in" ? Number(e.amount) : 0, outAmt: e.direction === "out" ? Number(e.amount) : 0,
      method: e.method, by: e.creator?.full_name ?? "", entry: e,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const tiles = [
    { label: "Total inflow", value: rupees(inflow), note: "Payments + other money in", icon: ArrowDownLeft, cls: "bg-green-50 text-green-700", val: "text-green-700" },
    { label: "Total outflow", value: rupees(outflow), note: "Expenses and money out", icon: ArrowUpRight, cls: "bg-red-50 text-red-600", val: "text-red-600" },
    { label: "Net balance", value: rupees(inflow - outflow), note: "Inflow minus outflow", icon: Landmark, cls: "bg-orange-500 text-white", val: "text-orange-600" },
    { label: "Cash in hand", value: rupees(openingCash + cashMovement), note: `Opening cash ${rupees(openingCash)} + cash in these dates`, icon: Wallet, cls: "bg-purple-600 text-white", val: "text-purple-700" },
  ];

  return (
    <>
      <PageTitle title="Inflow & Outflow" />
      <DateRange from={from} to={to} today={today} />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Tile key={t.label} label={t.label} value={t.value} note={t.note} icon={t.icon} iconClass={t.cls} valueClass={t.val} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {rows.length === 0 ? (
            <Empty>No money in or out for these dates.</Empty>
          ) : (
            <Table head={["Date", "Details", "In", "Out", "Method", "By", ""]}>
              {rows.map((r) => (
                <tr key={r.key} className={r.entry?.is_void ? "text-slate-400 line-through" : ""}>
                  <td className="px-4 py-3 whitespace-nowrap">{dateIST(r.date)}</td>
                  <td className="px-4 py-3">
                    {r.what}
                    {r.ref && <div className="text-xs text-slate-500">{r.ref}</div>}
                    {r.entry?.void_reason && <div className="text-xs no-underline">Void: {r.entry.void_reason}</div>}
                  </td>
                  <td className="px-4 py-3 text-green-700">{r.inAmt ? rupees(r.inAmt) : ""}</td>
                  <td className="px-4 py-3 text-red-600">{r.outAmt ? rupees(r.outAmt) : ""}</td>
                  <td className="px-4 py-3">{r.method}</td>
                  <td className="px-4 py-3">{r.by}</td>
                  <td className="px-4 py-3">
                    {r.entry && !r.entry.is_void && can(profile, "owner", "accountant") && (
                      <ActionForm action={voidCashEntry} submitLabel="Void" variant="danger" className="flex gap-2">
                        <input type="hidden" name="id" value={r.entry.id} />
                        <input name="reason" placeholder="Reason" className={`${inputBase} w-28`} />
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <p className="mt-2 text-xs text-slate-500">Service payments come from the Payments screen automatically. Entries are never deleted; wrong ones are voided with a reason.</p>
        </div>

        <Card title="Add money in or out">
          <ActionForm action={addCashEntry} submitLabel="Save entry">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select name="direction" className={inputClass} defaultValue="out">
                  <option value="out">Money out (expense)</option>
                  <option value="in">Money in</option>
                </select>
              </Field>
              <Field label="Amount ₹">
                <input name="amount" type="number" step="0.01" min="1" required className={inputClass} />
              </Field>
            </div>
            <Field label="Category">
              <select name="category" className={inputClass} required defaultValue="">
                <option value="" disabled>Choose</option>
                <optgroup label="Money out">{OUT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</optgroup>
                <optgroup label="Money in">{IN_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</optgroup>
                <option>Other</option>
              </select>
            </Field>
            <Field label="If other, what?">
              <input name="other_category" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Method">
                <select name="method" className={inputClass}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Date">
                <input name="entry_date" type="date" defaultValue={today} className={inputClass} />
              </Field>
            </div>
            <Field label="Note">
              <input name="note" placeholder="e.g. October shop rent" className={inputClass} />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
