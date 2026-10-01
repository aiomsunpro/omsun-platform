import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import { Empty, PageTitle, Table } from "@/components/ui";

type Row = {
  id: string;
  document_name: string;
  kind: "input" | "output";
  verification: "pending" | "verified" | "rejected";
  verification_note: string | null;
  created_at: string;
  service_requests: {
    id: string;
    request_number: string;
    customers: { full_name: string; mobile: string | null } | null;
    services: { name_en: string } | null;
  } | null;
  verifier: { full_name: string | null; email: string | null } | null;
};

const FILTERS = [
  ["verified", "Verified"],
  ["pending", "Waiting to check"],
  ["rejected", "Not OK"],
  ["output", "Finished documents"],
  ["all", "All"],
] as const;

const BADGE = {
  verified: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-900",
  rejected: "bg-red-100 text-red-800",
};

// Customer documents across all requests the signed-in staff member can see.
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { supabase } = await requireStaff(["owner", "manager", "accountant", "service_executive"]);
  const { show = "verified" } = await searchParams;

  let query = supabase
    .from("request_documents")
    .select(
      "id, document_name, kind, verification, verification_note, created_at, service_requests(id, request_number, customers(full_name, mobile), services(name_en)), verifier:profiles!request_documents_verified_by_fkey(full_name, email)",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (show === "output") query = query.eq("kind", "output");
  else if (show !== "all") query = query.eq("kind", "input").eq("verification", show);
  const { data, error } = await query.returns<Row[]>();

  return (
    <>
      <PageTitle title="Verified Docs" />
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/documents?show=${key}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              show === key ? "bg-blue-900 text-white" : "bg-white text-blue-900 ring-1 ring-blue-200 hover:bg-blue-50"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
      {error && <p className="mb-4 text-sm text-red-700">{error.message}</p>}
      {data && data.length === 0 ? (
        <Empty>No documents here.</Empty>
      ) : (
        <Table head={["Document", "Customer", "Service", "Request", "Check", "Checked by", "Uploaded"]}>
          {data?.map((d) => (
            <tr key={d.id}>
              <td className="px-4 py-3 font-medium">
                {d.document_name}
                {d.kind === "output" && <span className="ml-2 rounded bg-blue-100 px-1.5 text-xs text-blue-800">Finished</span>}
              </td>
              <td className="px-4 py-3">
                {d.service_requests?.customers?.full_name ?? "—"}
                {d.service_requests?.customers?.mobile && (
                  <span className="block text-xs text-slate-500">{d.service_requests.customers.mobile}</span>
                )}
              </td>
              <td className="px-4 py-3">{d.service_requests?.services?.name_en ?? "—"}</td>
              <td className="px-4 py-3">
                {d.service_requests && (
                  <Link href={`/admin/requests/${d.service_requests.id}`} className="text-blue-700 underline">
                    {d.service_requests.request_number}
                  </Link>
                )}
              </td>
              <td className="px-4 py-3">
                {d.kind === "input" ? (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[d.verification]}`}>
                    {FILTERS.find(([k]) => k === d.verification)?.[1]}
                  </span>
                ) : (
                  "—"
                )}
                {d.verification_note && <span className="block text-xs text-slate-500">{d.verification_note}</span>}
              </td>
              <td className="px-4 py-3">{d.verifier?.full_name || d.verifier?.email || "—"}</td>
              <td className="px-4 py-3 text-slate-600">{dateIST(d.created_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
