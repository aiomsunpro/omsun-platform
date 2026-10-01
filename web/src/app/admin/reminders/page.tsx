import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dateIST } from "@/lib/format";
import { addDays, todayIST } from "@/lib/dates";
import { CLOSED_STAGES, type Lead } from "@/lib/leads";
import { StageBadge } from "@/components/leads-board";
import { Empty, PageTitle, Table } from "@/components/ui";

type Row = Lead & { assignee: { full_name: string | null; email: string | null } | null };

// Follow-ups that are late, due today, or due in the coming week.
export default async function RemindersPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { supabase, profile } = await requireStaff(["owner", "manager", "sales_executive", "service_executive"]);
  const { all } = await searchParams;
  const today = todayIST();
  const leadsPerson = profile.role === "owner" || profile.role === "manager";

  let query = supabase
    .from("leads")
    .select("*, assignee:profiles!leads_assigned_to_fkey(full_name, email)")
    .not("stage", "in", `(${CLOSED_STAGES.join(",")})`)
    .not("next_follow_up_on", "is", null)
    .lte("next_follow_up_on", addDays(today, 7))
    .order("next_follow_up_on")
    .limit(500);
  if (!leadsPerson || !all) query = query.eq("assigned_to", profile.id);
  const { data, error } = await query.returns<Row[]>();

  const groups = [
    { title: "Overdue", tone: "text-red-700", rows: data?.filter((l) => l.next_follow_up_on! < today) ?? [] },
    { title: "Today", tone: "text-blue-900", rows: data?.filter((l) => l.next_follow_up_on === today) ?? [] },
    { title: "Next 7 days", tone: "text-slate-700", rows: data?.filter((l) => l.next_follow_up_on! > today) ?? [] },
  ];

  return (
    <>
      <PageTitle title="Reminders">
        {leadsPerson && (
          <div className="flex gap-2 text-xs font-semibold">
            <Link href="/admin/reminders" className={`rounded-full px-3 py-1 ${!all ? "bg-blue-900 text-white" : "bg-white text-blue-900 ring-1 ring-blue-200"}`}>
              Mine
            </Link>
            <Link href="/admin/reminders?all=1" className={`rounded-full px-3 py-1 ${all ? "bg-blue-900 text-white" : "bg-white text-blue-900 ring-1 ring-blue-200"}`}>
              Whole team
            </Link>
          </div>
        )}
      </PageTitle>
      {error && <p className="mb-4 text-sm text-red-700">{error.message}</p>}
      <div className="space-y-8">
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className={`mb-3 font-semibold ${g.tone}`}>
              {g.title} ({g.rows.length})
            </h2>
            {g.rows.length === 0 ? (
              <Empty>Nothing {g.title.toLowerCase()}.</Empty>
            ) : (
              <Table head={["Follow-up", "Name", "Mobile", "Kind", "Stage", "Assigned to"]}>
                {g.rows.map((l) => (
                  <tr key={l.id} className="hover:bg-blue-50/40">
                    <td className={`px-4 py-3 ${g.tone}`}>{dateIST(l.next_follow_up_on!)}</td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/admin/leads/${l.id}`} className="text-blue-800 hover:underline">
                        {l.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`tel:${l.mobile}`} className="text-blue-700 hover:underline">
                        {l.mobile}
                      </a>
                    </td>
                    <td className="px-4 py-3">{l.lead_type === "enquiry" ? "Enquiry" : "Retailer lead"}</td>
                    <td className="px-4 py-3">
                      <StageBadge stage={l.stage} />
                    </td>
                    <td className="px-4 py-3">{l.assignee?.full_name || l.assignee?.email || "—"}</td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
