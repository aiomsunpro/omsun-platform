import { ArrowDownLeft, ArrowUpRight, ClipboardList, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { todayIST, validDate } from "@/lib/dates";
import { dateIST, rupees } from "@/lib/format";
import { DateRange, Tile } from "@/components/report-bits";
import { Empty, PageTitle, Table } from "@/components/ui";

type StaffRow = {
  staff_id: string | null;
  staff_name: string;
  requests_created: number;
  requests_completed: number;
  payments: number;
  cash: number;
  upi: number;
  other: number;
  collected: number;
};
type Day = { day: string; requests: number; business: number; collected: number; other_in: number; other_out: number };

const sum = <T,>(rows: T[] | null, k: keyof T) => (rows ?? []).reduce((a, r) => a + Number(r[k]), 0);

// End of day: who did what and how the money came in, for one day or a range.
export default async function DailyReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { supabase } = await requireStaff(["owner", "manager", "accountant"]);
  const today = todayIST();
  const sp = await searchParams;
  const from = validDate(sp.from, today);
  const to = validDate(sp.to, from > today ? from : today);

  const [{ data: staff, error }, { data: days }] = await Promise.all([
    supabase.rpc("report_staff_day", { p_start: from, p_end: to }).then((r) => ({ ...r, data: r.data as StaffRow[] | null })),
    supabase.rpc("report_days", { p_start: from, p_end: to }).then((r) => ({ ...r, data: r.data as Day[] | null })),
  ]);

  const collected = sum(days, "collected");
  const otherIn = sum(days, "other_in");
  const otherOut = sum(days, "other_out");

  return (
    <>
      <PageTitle title="EOD Report" />
      <p className="-mt-3 mb-5 text-sm text-slate-600">
        {from === to ? dateIST(from) : `${dateIST(from)} to ${dateIST(to)}`}
      </p>
      <DateRange from={from} to={to} today={today} />
      {error && <p className="mb-4 text-sm text-red-700">{error.message}</p>}

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Requests" value={sum(days, "requests")} note={`Business booked ${rupees(sum(days, "business"))}`} icon={ClipboardList} iconClass="bg-blue-100 text-blue-800" />
        <Tile label="Payments collected" value={rupees(collected)} note={`Cash ${rupees(sum(staff, "cash"))} · UPI ${rupees(sum(staff, "upi"))}`} icon={Wallet} iconClass="bg-yellow-400 text-blue-950" valueClass="text-green-700" />
        <Tile label="Other money in" value={rupees(otherIn)} note="From the cash book" icon={ArrowDownLeft} iconClass="bg-green-50 text-green-700" />
        <Tile label="Money out" value={rupees(otherOut)} note={`Net for the period ${rupees(collected + otherIn - otherOut)}`} icon={ArrowUpRight} iconClass="bg-red-50 text-red-600" valueClass="text-red-600" />
      </div>

      <h2 className="mb-3 font-semibold text-blue-950">By staff member</h2>
      {staff && staff.length === 0 ? (
        <Empty>No work recorded in these dates.</Empty>
      ) : (
        <Table head={["Staff", "Requests made", "Completed", "Payments", "Cash", "UPI", "Bank / other", "Collected"]}>
          {staff?.map((r) => (
            <tr key={r.staff_id ?? "retailers"}>
              <td className="px-4 py-3 font-medium">{r.staff_name}</td>
              <td className="px-4 py-3">{r.requests_created}</td>
              <td className="px-4 py-3">{r.requests_completed}</td>
              <td className="px-4 py-3">{r.payments}</td>
              <td className="px-4 py-3">{rupees(r.cash)}</td>
              <td className="px-4 py-3">{rupees(r.upi)}</td>
              <td className="px-4 py-3">{rupees(r.other)}</td>
              <td className="px-4 py-3 font-semibold text-green-700">{rupees(r.collected)}</td>
            </tr>
          ))}
          {staff && staff.length > 1 && (
            <tr className="bg-blue-50 font-semibold">
              <td className="px-4 py-3">Total</td>
              <td className="px-4 py-3">{sum(staff, "requests_created")}</td>
              <td className="px-4 py-3">{sum(staff, "requests_completed")}</td>
              <td className="px-4 py-3">{sum(staff, "payments")}</td>
              <td className="px-4 py-3">{rupees(sum(staff, "cash"))}</td>
              <td className="px-4 py-3">{rupees(sum(staff, "upi"))}</td>
              <td className="px-4 py-3">{rupees(sum(staff, "other"))}</td>
              <td className="px-4 py-3 text-green-700">{rupees(sum(staff, "collected"))}</td>
            </tr>
          )}
        </Table>
      )}
    </>
  );
}
