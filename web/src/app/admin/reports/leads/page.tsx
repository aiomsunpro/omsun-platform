import { CircleCheck, CircleHelp, Megaphone, TriangleAlert } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { todayIST, validDate } from "@/lib/dates";
import { DateRange, Tile } from "@/components/report-bits";
import { Empty, PageTitle, Table } from "@/components/ui";

type Row = {
  staff_id: string | null;
  staff_name: string;
  lead_type: "retailer" | "enquiry";
  added: number;
  activities: number;
  converted: number;
  lost: number;
  open_now: number;
  overdue: number;
};

const sum = (rows: Row[], k: keyof Row) => rows.reduce((a, r) => a + Number(r[k]), 0);

// Leads and enquiries per staff member. Sales executives see only their own.
export default async function LeadReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { supabase } = await requireStaff(["owner", "manager", "sales_executive"]);
  const today = todayIST();
  const sp = await searchParams;
  const from = validDate(sp.from, `${today.slice(0, 8)}01`);
  const to = validDate(sp.to, from > today ? from : today);
  const { data, error } = await supabase.rpc("report_leads", { p_start: from, p_end: to }).then((r) => ({ ...r, data: r.data as Row[] | null }));
  const rows = data ?? [];
  const sections = [
    { type: "retailer", title: "Retailer leads", rows: rows.filter((r) => r.lead_type === "retailer") },
    { type: "enquiry", title: "Customer enquiries", rows: rows.filter((r) => r.lead_type === "enquiry") },
  ];

  return (
    <>
      <PageTitle title="Lead Reports" />
      <DateRange from={from} to={to} today={today} />
      {error && <p className="mb-4 text-sm text-red-700">{error.message}</p>}

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Added" value={sum(rows, "added")} note="Leads and enquiries in these dates" icon={Megaphone} iconClass="bg-blue-100 text-blue-800" />
        <Tile label="Calls and visits" value={sum(rows, "activities")} note="Logged in these dates" icon={CircleHelp} iconClass="bg-yellow-400 text-blue-950" />
        <Tile label="Converted" value={sum(rows, "converted")} note={`${sum(rows, "lost")} lost or not interested`} icon={CircleCheck} iconClass="bg-green-50 text-green-700" valueClass="text-green-700" />
        <Tile label="Overdue follow-ups" value={sum(rows, "overdue")} note={`${sum(rows, "open_now")} open right now`} icon={TriangleAlert} iconClass="bg-red-50 text-red-600" valueClass="text-red-600" />
      </div>

      {sections.map((s) => (
        <section key={s.type} className="mb-8">
          <h2 className="mb-3 font-semibold text-blue-950">{s.title}</h2>
          {s.rows.length === 0 ? (
            <Empty>No {s.title.toLowerCase()} yet.</Empty>
          ) : (
            <Table head={["Staff", "Added", "Calls / visits", "Converted", "Lost", "Open now", "Overdue"]}>
              {s.rows.map((r) => (
                <tr key={`${r.staff_id}-${r.lead_type}`}>
                  <td className="px-4 py-3 font-medium">{r.staff_name}</td>
                  <td className="px-4 py-3">{r.added}</td>
                  <td className="px-4 py-3">{r.activities}</td>
                  <td className="px-4 py-3 text-green-700">{r.converted}</td>
                  <td className="px-4 py-3">{r.lost}</td>
                  <td className="px-4 py-3">{r.open_now}</td>
                  <td className={`px-4 py-3 ${r.overdue > 0 ? "font-semibold text-red-700" : ""}`}>{r.overdue}</td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      ))}
    </>
  );
}
