import Link from "next/link";
import { can, requireStaff } from "@/lib/auth";
import { dateIST, OPEN_STATUSES, rupees, STATUS_LABEL } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";
import { Empty, inputBase, PageTitle, StatusBadge, Table } from "@/components/ui";

type Row = {
  id: string;
  request_number: string;
  channel: string;
  token_number: number | null;
  status: RequestStatus;
  priority: string;
  customer_price: number;
  payment_status: string;
  submitted_at: string;
  customers: { full_name: string; mobile: string | null } | null;
  services: { name_en: string } | null;
  retailers: { business_name: string } | null;
  assignee: { full_name: string | null } | null;
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; customer?: string }>;
}) {
  const { supabase, profile } = await requireStaff([
    "owner", "manager", "accountant", "sales_executive", "service_executive",
  ]);
  const { status = "open", q = "", customer = "" } = await searchParams;

  let query = supabase
    .from("service_requests")
    .select(
      "id, request_number, channel, token_number, status, priority, customer_price, payment_status, submitted_at, customers(full_name, mobile), services(name_en), retailers(business_name), assignee:profiles!service_requests_assigned_to_fkey(full_name)",
    )
    .order("submitted_at", { ascending: false })
    .limit(200);
  if (status === "open") query = query.in("status", OPEN_STATUSES);
  else if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("request_number", `%${q.trim()}%`);
  if (customer) query = query.eq("customer_id", customer);

  const { data, error } = await query.returns<Row[]>();

  return (
    <>
      <PageTitle title="Service requests">
        {can(profile, "owner", "manager", "service_executive") && (
          <Link href="/admin/requests/new" className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            New walk-in
          </Link>
        )}
      </PageTitle>

      <form className="mb-4 flex flex-wrap gap-3">
        <select name="status" defaultValue={status} className={`${inputBase} w-auto`}>
          <option value="open">All open</option>
          <option value="all">Everything</option>
          {(Object.keys(STATUS_LABEL) as RequestStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="Request number" className={`${inputBase} w-48`} />
        <button className="rounded-md border border-blue-200 bg-white px-4 py-2 text-sm text-blue-800 hover:bg-blue-50">Filter</button>
      </form>

      {error && <p className="text-sm text-red-700">{error.message}</p>}
      {data && data.length === 0 ? (
        <Empty>No requests here.</Empty>
      ) : (
        <Table head={["Request", "Customer", "Service", "From", "Assigned to", "Status", "Price", "Submitted"]}>
          {data?.map((r) => (
            <tr key={r.id} className="hover:bg-blue-50/50">
              <td className="px-4 py-3">
                <Link href={`/admin/requests/${r.id}`} className="font-medium text-blue-700 underline">
                  {r.request_number}
                </Link>
                {r.priority === "urgent" && <span className="ml-2 text-xs font-semibold text-red-700">URGENT</span>}
              </td>
              <td className="px-4 py-3">
                {r.customers?.full_name}
                <div className="text-xs text-gray-500">{r.customers?.mobile}</div>
              </td>
              <td className="px-4 py-3">{r.services?.name_en}</td>
              <td className="px-4 py-3">
                {r.channel === "walk_in" ? `Walk-in #${r.token_number}` : r.retailers?.business_name ?? r.channel}
              </td>
              <td className="px-4 py-3">{r.assignee?.full_name ?? <span className="text-gray-400">—</span>}</td>
              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3">
                {rupees(r.customer_price)}
                <div className="text-xs text-gray-500">{r.payment_status}</div>
              </td>
              <td className="px-4 py-3 text-gray-600">{dateIST(r.submitted_at, true)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
