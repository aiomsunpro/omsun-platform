import Link from "next/link";
import { requireStaff, can } from "@/lib/auth";
import { dateIST, rupees } from "@/lib/format";
import { addDays, todayIST } from "@/lib/dates";
import { ActionForm } from "@/components/action-form";
import { Card, Empty, Field, inputClass, PageTitle, Table } from "@/components/ui";
import { createSettlement, finalizeSettlement } from "./actions";

type Row = {
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
  finalized_at: string | null;
  retailers: { business_name: string; village: string | null } | null;
};

// Monthly statement per OMSUN Mitra retailer: what their customers paid,
// the commission they keep, and OMSUN's share.
export default async function SettlementsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { supabase, profile } = await requireStaff(["owner", "manager", "accountant"]);
  const { show = "all" } = await searchParams;
  const canEdit = can(profile, "owner", "accountant");

  let query = supabase
    .from("retailer_settlements")
    .select("*, retailers(business_name, village)")
    .order("period_start", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (show === "draft" || show === "finalized") query = query.eq("status", show);
  const [{ data, error }, { data: retailers }] = await Promise.all([
    query.returns<Row[]>(),
    supabase.from("retailers").select("id, business_name").eq("status", "approved").order("business_name"),
  ]);

  // Default to last month: settlements are made after the month closes.
  const lastMonth = addDays(`${todayIST().slice(0, 7)}-01`, -1).slice(0, 7);
  const totalBalance = (data ?? []).reduce((sum, r) => sum + Number(r.balance), 0);

  return (
    <>
      <PageTitle title="Retailer Settlements" />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[
          ["all", "All"],
          ["draft", "Draft"],
          ["finalized", "Finalized"],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/settlements?show=${key}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              show === key ? "bg-blue-900 text-white" : "bg-white text-blue-900 ring-1 ring-blue-200 hover:bg-blue-50"
            }`}
          >
            {label}
          </Link>
        ))}
        <span className="ml-auto text-sm text-slate-600">
          Balance on this list: <b className="text-blue-950">{rupees(totalBalance)}</b>
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-red-700">{error.message}</p>}
      {data && data.length === 0 ? (
        <Empty>No settlements yet.</Empty>
      ) : (
        <Table head={["Retailer", "Period", "Requests", "Customer fees", "Commission", "Due to OMSUN", "Received", "Balance", "Status", ""]}>
          {data?.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium">
                {r.retailers?.business_name}
                {r.retailers?.village && <span className="block text-xs text-slate-500">{r.retailers.village}</span>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                {dateIST(r.period_start)} – {dateIST(r.period_end)}
              </td>
              <td className="px-4 py-3">{r.request_count}</td>
              <td className="px-4 py-3">{rupees(r.gross_amount)}</td>
              <td className="px-4 py-3">{rupees(r.commission_amount)}</td>
              <td className="px-4 py-3">{rupees(r.amount_due)}</td>
              <td className="px-4 py-3">{rupees(r.amount_received)}</td>
              <td className={`px-4 py-3 font-semibold ${Number(r.balance) > 0 ? "text-red-700" : "text-green-700"}`}>{rupees(r.balance)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    r.status === "finalized" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {r.status === "finalized" ? "Finalized" : "Draft"}
                </span>
              </td>
              <td className="px-4 py-3">
                {canEdit && r.status === "draft" && (
                  <ActionForm action={finalizeSettlement} submitLabel="Finalize" variant="secondary" className="">
                    <input type="hidden" name="id" value={r.id} />
                  </ActionForm>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {canEdit && (
        <div className="mt-8 max-w-2xl">
          <Card title="Make a monthly settlement">
            <ActionForm action={createSettlement} submitLabel="Draft settlement">
              <p className="text-sm text-slate-600">
                Adds up the retailer&apos;s completed requests for the month and links their earned commissions. Finalizing marks
                those commissions as settled.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Retailer">
                  <select name="retailer_id" required className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Choose a retailer
                    </option>
                    {retailers?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.business_name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Month">
                  <input type="month" name="month" required defaultValue={lastMonth} className={inputClass} />
                </Field>
              </div>
            </ActionForm>
          </Card>
        </div>
      )}
    </>
  );
}
