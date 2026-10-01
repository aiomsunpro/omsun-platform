import Link from "next/link";
import { can, requireStaff } from "@/lib/auth";
import { dateIST, rupees } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { Empty, inputBase, PageTitle, Table } from "@/components/ui";
import { reversePayment, verifyPayment } from "./actions";

type Row = Payment & {
  service_requests: { id: string; request_number: string } | null;
  retailers: { business_name: string } | null;
  receiver: { full_name: string | null; email: string | null } | null;
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase, profile } = await requireStaff(["owner", "manager", "accountant"]);
  const { status = "all" } = await searchParams;
  let q = supabase
    .from("payments")
    .select("*, service_requests(id, request_number), retailers(business_name), receiver:profiles!payments_received_by_fkey(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") q = q.eq("status", status);
  const { data: payments } = await q.returns<Row[]>();
  const checker = can(profile, "owner", "accountant");
  const total = (payments ?? []).filter((p) => p.status !== "reversed").reduce((s, p) => s + Number(p.amount), 0);

  return (
    <>
      <PageTitle title="Payments" />
      <form className="mb-4 flex flex-wrap items-center gap-3">
        <select name="status" defaultValue={status} className={`${inputBase} w-auto`}>
          <option value="all">All</option>
          <option value="recorded">To verify</option>
          <option value="verified">Verified</option>
          <option value="reversed">Reversed</option>
        </select>
        <button className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm text-blue-800 hover:bg-blue-50">Filter</button>
        <span className="text-sm text-gray-600">Total shown (excluding reversed): <b>{rupees(total)}</b></span>
      </form>

      {payments && payments.length === 0 ? (
        <Empty>No payments here.</Empty>
      ) : (
        <Table head={["Receipt", "For", "Amount", "Method", "Paid on", "Received by", "Status", ...(checker ? ["Check"] : [])]}>
          {payments?.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 font-medium">{p.receipt_number}</td>
              <td className="px-4 py-3">
                {p.service_requests ? (
                  <Link href={`/admin/requests/${p.service_requests.id}`} className="text-blue-700 underline">{p.service_requests.request_number}</Link>
                ) : (
                  p.purpose.replace("_", " ")
                )}
                <div className="text-xs text-gray-500">{p.payer_type}{p.retailers ? ` · ${p.retailers.business_name}` : ""}</div>
              </td>
              <td className="px-4 py-3">{rupees(p.amount)}</td>
              <td className="px-4 py-3">
                {p.method}
                {p.reference && <div className="text-xs text-gray-500">{p.reference}</div>}
              </td>
              <td className="px-4 py-3">{dateIST(p.paid_on)}</td>
              <td className="px-4 py-3">{p.receiver?.full_name || p.receiver?.email}</td>
              <td className="px-4 py-3">
                <span className={p.status === "reversed" ? "text-red-700" : p.status === "verified" ? "text-green-700" : "text-yellow-800"}>{p.status}</span>
                {p.reversal_reason && <div className="text-xs text-gray-500">{p.reversal_reason}</div>}
              </td>
              {checker && (
                <td className="space-y-2 px-4 py-3">
                  {p.status === "recorded" && (
                    <ActionForm action={verifyPayment} submitLabel="Verify" className="">
                      <input type="hidden" name="id" value={p.id} />
                    </ActionForm>
                  )}
                  {p.status !== "reversed" && (
                    <ActionForm action={reversePayment} submitLabel="Reverse" variant="danger" className="flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="reason" placeholder="Reason" className={`${inputBase} w-32`} />
                    </ActionForm>
                  )}
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
