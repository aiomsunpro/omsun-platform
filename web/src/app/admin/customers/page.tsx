import Link from "next/link";
import { Search } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import { Empty, PageTitle, Table } from "@/components/ui";

type Row = {
  id: string;
  full_name: string;
  mobile: string | null;
  village: string | null;
  taluka: string | null;
  created_at: string;
  retailers: { business_name: string } | null;
  service_requests: { id: string }[];
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase } = await requireStaff();
  const { q = "" } = await searchParams;
  const term = q.trim().replace(/[%,()]/g, "");

  let query = supabase
    .from("customers")
    .select("id, full_name, mobile, village, taluka, created_at, retailers(business_name), service_requests(id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (term) {
    const digits = term.replace(/\D/g, "");
    query = digits.length >= 4
      ? query.ilike("mobile", `%${digits}%`)
      : query.ilike("full_name", `%${term}%`);
  }
  const { data, error } = await query.returns<Row[]>();

  return (
    <>
      <PageTitle title="Customer Management" />
      <form className="mb-5 flex max-w-xl items-center">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search customer by name or mobile"
          className="min-w-0 flex-1 rounded-l-full border border-r-0 border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none"
        />
        <button aria-label="Search" className="rounded-r-full bg-blue-900 px-4 py-2.5 text-white hover:bg-blue-800">
          <Search size={16} />
        </button>
      </form>
      {error && <p className="text-sm text-red-700">{error.message}</p>}
      {data && data.length === 0 ? (
        <Empty>{term ? `No customer matches “${q}”.` : "No customers yet."}</Empty>
      ) : (
        <Table head={["Customer", "Mobile", "Place", "Came through", "Requests", "Added"]}>
          {data?.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium">{c.full_name}</td>
              <td className="px-4 py-3">{c.mobile ?? "—"}</td>
              <td className="px-4 py-3">{[c.village, c.taluka].filter(Boolean).join(", ") || "—"}</td>
              <td className="px-4 py-3">{c.retailers?.business_name ?? "OMSUN office"}</td>
              <td className="px-4 py-3">
                {c.service_requests.length > 0 ? (
                  <Link href={`/admin/requests?status=all&customer=${c.id}`} className="text-blue-700 underline">
                    {c.service_requests.length}
                  </Link>
                ) : (
                  0
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{dateIST(c.created_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
