import Link from "next/link";
import { ArrowUpRight, ClipboardList, HandCoins, Wallet } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { addDays, monthRange, todayIST } from "@/lib/dates";
import { dateIST, rupees } from "@/lib/format";
import { Tile } from "@/components/report-bits";
import { Empty, inputBase, PageTitle, Table } from "@/components/ui";

type Svc = { service_id: string; service_name: string; requests: number; completed: number; business: number; commission: number; collected: number };
type Day = { day: string; requests: number; business: number; collected: number; other_in: number; other_out: number };

const sum = <T,>(rows: T[] | null, k: keyof T) => (rows ?? []).reduce((a, r) => a + Number(r[k]), 0);

export default async function MonthlyReport({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { supabase } = await requireStaff(["owner", "manager", "accountant"]);
  const today = todayIST();
  const sp = await searchParams;
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : today.slice(0, 7);
  const { first, last } = monthRange(month);
  const prev = addDays(first, -1).slice(0, 7);
  const next = addDays(last, 1).slice(0, 7);
  const label = new Date(`${first}T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

  const [{ data: services, error }, { data: days }] = await Promise.all([
    supabase.rpc("report_services", { p_start: first, p_end: last }).then((r) => ({ ...r, data: r.data as Svc[] | null })),
    supabase.rpc("report_days", { p_start: first, p_end: last > today ? today : last }).then((r) => ({ ...r, data: r.data as Day[] | null })),
  ]);
  const activeDays = (days ?? []).filter((d) => d.requests > 0 || d.collected > 0 || d.other_in > 0 || d.other_out > 0);
  const collected = sum(days, "collected");
  const otherIn = sum(days, "other_in");
  const out = sum(days, "other_out");

  return (
    <>
      <PageTitle title="Monthly Report">
        <form className="flex items-center gap-2 text-sm">
          <Link href={`?month=${prev}`} className="rounded-md border border-slate-300 bg-white px-3 py-2">←</Link>
          <input type="month" name="month" defaultValue={month} className={inputBase} />
          <button className="rounded-md bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800">Show</button>
          {next <= today.slice(0, 7) && (
            <Link href={`?month=${next}`} className="rounded-md border border-slate-300 bg-white px-3 py-2">→</Link>
          )}
        </form>
      </PageTitle>
      <p className="-mt-3 mb-5 text-sm font-medium text-slate-600">{label}</p>
      {error && <p className="mb-4 text-sm text-red-700">{error.message}</p>}

      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Requests" value={sum(services, "requests")} note={`${sum(services, "completed")} completed`} icon={ClipboardList} iconClass="bg-blue-100 text-blue-800" />
        <Tile label="Business booked" value={rupees(sum(services, "business"))} note={`Retailer commission ${rupees(sum(services, "commission"))}`} icon={HandCoins} iconClass="bg-yellow-400 text-blue-950" />
        <Tile label="Money in" value={rupees(collected + otherIn)} note={`Payments ${rupees(collected)} + other ${rupees(otherIn)}`} icon={Wallet} iconClass="bg-green-50 text-green-700" valueClass="text-green-700" />
        <Tile label="Money out" value={rupees(out)} note={`Net ${rupees(collected + otherIn - out)}`} icon={ArrowUpRight} iconClass="bg-red-50 text-red-600" valueClass="text-red-600" />
      </div>

      <h2 className="mb-3 font-semibold text-blue-950">By service</h2>
      {services && services.length === 0 ? (
        <Empty>No requests in {label}.</Empty>
      ) : (
        <Table head={["Service", "Requests", "Completed", "Business", "Retailer commission", "Collected"]}>
          {services?.map((s) => (
            <tr key={s.service_id}>
              <td className="px-4 py-3 font-medium">{s.service_name}</td>
              <td className="px-4 py-3">{s.requests}</td>
              <td className="px-4 py-3">{s.completed}</td>
              <td className="px-4 py-3">{rupees(s.business)}</td>
              <td className="px-4 py-3">{rupees(s.commission)}</td>
              <td className="px-4 py-3 font-semibold text-green-700">{rupees(s.collected)}</td>
            </tr>
          ))}
        </Table>
      )}

      <h2 className="mb-3 mt-8 font-semibold text-blue-950">By day</h2>
      {activeDays.length === 0 ? (
        <Empty>Nothing recorded yet.</Empty>
      ) : (
        <Table head={["Date", "Requests", "Business", "Payments", "Other in", "Out", "Net"]}>
          {activeDays.map((d) => (
            <tr key={d.day}>
              <td className="px-4 py-3">
                <Link href={`/admin/reports/daily?from=${d.day}&to=${d.day}`} className="text-blue-700 underline">
                  {dateIST(d.day)}
                </Link>
              </td>
              <td className="px-4 py-3">{d.requests}</td>
              <td className="px-4 py-3">{rupees(d.business)}</td>
              <td className="px-4 py-3">{rupees(d.collected)}</td>
              <td className="px-4 py-3">{rupees(d.other_in)}</td>
              <td className="px-4 py-3 text-red-600">{rupees(d.other_out)}</td>
              <td className="px-4 py-3 font-semibold">{rupees(Number(d.collected) + Number(d.other_in) - Number(d.other_out))}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
