import type { LucideIcon } from "lucide-react";
import { addDays } from "@/lib/dates";
import { inputBase } from "@/components/ui";

// From/to picker with quick ranges, for reports and the cash book.
export function DateRange({ from, to, today }: { from: string; to: string; today: string }) {
  return (
    <form className="mb-5 flex flex-wrap items-end gap-3 text-sm">
      <label>
        From <input type="date" name="from" defaultValue={from} className={`${inputBase} ml-1`} />
      </label>
      <label>
        To <input type="date" name="to" defaultValue={to} className={`${inputBase} ml-1`} />
      </label>
      <button className="rounded-md bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800">Show</button>
      <a href={`?from=${today}&to=${today}`} className="rounded-full border border-slate-300 bg-white px-3 py-1.5">
        Today
      </a>
      <a href={`?from=${addDays(today, -1)}&to=${addDays(today, -1)}`} className="rounded-full border border-slate-300 bg-white px-3 py-1.5">
        Yesterday
      </a>
      <a href={`?from=${addDays(today, -6)}&to=${today}`} className="rounded-full border border-slate-300 bg-white px-3 py-1.5">
        Last 7 days
      </a>
      <a href={`?from=${today.slice(0, 8)}01&to=${today}`} className="rounded-full border border-slate-300 bg-white px-3 py-1.5">
        This month
      </a>
    </form>
  );
}

export function Tile({
  label,
  value,
  note,
  icon: Icon,
  iconClass,
  valueClass = "text-blue-950",
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: LucideIcon;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon size={20} />
        </span>
      </div>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
      {note && <p className="mt-2 text-xs text-slate-400">{note}</p>}
    </div>
  );
}
