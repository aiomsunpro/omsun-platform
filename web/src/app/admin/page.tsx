import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CircleCheck,
  CirclePlus,
  ClipboardList,
  Clock,
  IndianRupee,
  Search,
  Settings,
  Store,
  TrendingUp,
  TriangleAlert,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { can, requireStaff } from "@/lib/auth";
import { OPEN_STATUSES, rupees, STATUS_LABEL } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

type Req = {
  id: string;
  request_number: string;
  status: RequestStatus;
  assigned_to: string | null;
  submitted_at: string;
  amount_due: number;
  amount_paid: number;
  services: { name_en: string; processing_days: number | null } | null;
  customers: { full_name: string } | null;
};

const TONE = {
  green: { value: "text-green-700", tile: "bg-green-50 text-green-700" },
  red: { value: "text-red-600", tile: "bg-red-50 text-red-600" },
  blue: { value: "text-blue-900", tile: "bg-blue-50 text-blue-800" },
  purple: { value: "text-purple-700", tile: "bg-purple-50 text-purple-700" },
  orange: { value: "text-orange-600", tile: "bg-orange-50 text-orange-600" },
};

function StatCard({
  label,
  value,
  note,
  href,
  icon: Icon,
  tone,
  children,
}: {
  label: string;
  value: string | number;
  note: string;
  href?: string;
  icon: LucideIcon;
  tone: keyof typeof TONE;
  children?: React.ReactNode;
}) {
  const body = (
    <div className="h-full rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className={`mt-2 text-3xl font-bold ${TONE[tone].value}`}>{value}</p>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONE[tone].tile}`}>
          <Icon size={22} />
        </span>
      </div>
      {children}
      <p className="mt-3 text-sm text-slate-400">
        {note} {href && <ArrowRight size={14} className="inline" />}
      </p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function Rate({ rate }: { rate: number }) {
  const label = rate >= 90 ? "Good" : rate >= 60 ? "Moderate" : "Low";
  return (
    <div className="mt-3">
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-yellow-400" style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className="mt-2 inline-block rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800">{label}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 border-l-4 border-blue-800 pl-3 text-sm font-bold uppercase tracking-widest text-slate-600">{title}</h2>
      {children}
    </section>
  );
}

function nowIST() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), ms: Date.now() };
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export default async function Dashboard() {
  const { supabase, profile } = await requireStaff();
  const { date: today, hour, ms: now } = nowIST();
  const startToday = `${today}T00:00:00+05:30`;
  const seesMoney = can(profile, "owner", "manager", "accountant");
  const seesRetailers = can(profile, "owner", "manager", "accountant", "sales_executive");

  // Everything below is already limited by row-level security (a service executive sees only their own work).
  const { data: reqData } = await supabase
    .from("service_requests")
    .select("id, request_number, status, assigned_to, submitted_at, amount_due, amount_paid, services(name_en, processing_days), customers(full_name)")
    .not("status", "in", "(cancelled,rejected)")
    .order("submitted_at", { ascending: true })
    .limit(5000)
    .returns<Req[]>();
  const reqs = reqData ?? [];
  const open = reqs.filter((r) => OPEN_STATUSES.includes(r.status));
  const overdue = open.filter(
    (r) => r.services?.processing_days != null && new Date(r.submitted_at).getTime() + r.services.processing_days * 86400000 < now,
  );
  const todayStart = new Date(startToday).getTime();
  const todays = reqs.filter((r) => new Date(r.submitted_at).getTime() >= todayStart);
  const due = (r: Req) => Math.max(Number(r.amount_due) - Number(r.amount_paid), 0);

  const { count: completedToday } = await supabase
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", startToday);

  let collectedToday = 0;
  let receivedAll = 0;
  if (seesMoney) {
    const { data: pays } = await supabase.from("payments").select("amount, paid_on").neq("status", "reversed").limit(20000);
    receivedAll = sum((pays ?? []).map((p) => Number(p.amount)));
    collectedToday = sum((pays ?? []).filter((p) => p.paid_on === today).map((p) => Number(p.amount)));
  }
  const businessToday = sum(todays.map((r) => Number(r.amount_due)));
  const pendingToday = sum(todays.map(due));
  const businessAll = sum(reqs.map((r) => Number(r.amount_due)));
  const pendingAll = sum(reqs.map(due));
  const rateToday = businessToday ? Math.round(((businessToday - pendingToday) / businessToday) * 100) : 0;
  const rateAll = businessAll ? Math.round(((businessAll - pendingAll) / businessAll) * 100) : 0;

  const [{ count: customers }, { count: services }] = await Promise.all([
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  let activeRetailers = 0;
  let pendingRetailers = 0;
  if (seesRetailers) {
    const [{ count: a }, { count: p }] = await Promise.all([
      supabase.from("retailers").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("retailers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    activeRetailers = a ?? 0;
    pendingRetailers = p ?? 0;
  }

  // What needs someone at OMSUN to act: late work, documents just received, new and unassigned.
  const action = [
    ...overdue.map((r) => ({ r, why: "Past expected time" })),
    ...open.filter((r) => r.status === "documents_received" && !overdue.includes(r)).map((r) => ({ r, why: "Documents received" })),
    ...open.filter((r) => r.status === "new" && !r.assigned_to && !overdue.includes(r)).map((r) => ({ r, why: "Not assigned yet" })),
  ].slice(0, 8);

  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const longDate = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const quick = [
    can(profile, "owner", "manager", "service_executive") && { href: "/admin/requests/new", label: "New Walk-in", icon: CirclePlus, style: "bg-blue-900 text-white border-blue-900" },
    { href: "/admin/requests", label: "Requests", icon: ClipboardList, style: "bg-sky-50 text-sky-800 border-sky-200" },
    seesMoney && { href: "/admin/payments", label: "Payments", icon: Wallet, style: "bg-green-50 text-green-800 border-green-200" },
    { href: "/admin/customers", label: "Customers", icon: Users, style: "bg-slate-100 text-slate-700 border-slate-200" },
    seesRetailers && { href: "/admin/retailers", label: "Retailers", icon: Store, style: "bg-yellow-50 text-yellow-800 border-yellow-300" },
  ].filter(Boolean) as { href: string; label: string; icon: LucideIcon; style: string }[];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Greeting banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 to-blue-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-yellow-300/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {greeting}, {profile.full_name || "team"} 👋
            </h1>
            <p className="mt-1 text-blue-100">{longDate}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2">
              <ClipboardList size={16} /> {open.length} open
            </span>
            {seesRetailers && (
              <span className="flex items-center gap-1.5 rounded-full bg-yellow-400 px-4 py-2 text-blue-950">
                <Store size={16} /> {activeRetailers} retailer{activeRetailers === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Alert strip */}
      {overdue.length === 0 ? (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-5 py-3 text-green-900">
          <CircleCheck size={20} className="text-green-600" /> <b>All caught up!</b> No requests are past their expected time.
        </div>
      ) : (
        <a href="#action-required" className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-red-900">
          <TriangleAlert size={20} className="text-red-600" /> <b>{overdue.length} request{overdue.length > 1 ? "s are" : " is"} past the expected time.</b> See below.
        </a>
      )}

      {/* Quick actions and search */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm lg:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Quick</span>
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${q.style}`}>
              <q.icon size={16} /> {q.label}
            </Link>
          ))}
        </div>
        <form action="/admin/customers" className="flex items-center rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <input
            name="q"
            placeholder="Search customer by name or mobile"
            className="min-w-0 flex-1 rounded-l-full border border-r-0 border-slate-200 px-4 py-2 text-sm focus:outline-none"
          />
          <button aria-label="Search" className="rounded-r-full bg-blue-900 px-4 py-2.5 text-white hover:bg-blue-800">
            <Search size={16} />
          </button>
        </form>
      </div>

      <Section title="Today's overview">
        <div className="grid gap-5 sm:grid-cols-2">
          {seesMoney && (
            <StatCard label="Today collected" value={rupees(collectedToday)} note="Payments received today" href="/admin/payments" icon={CircleCheck} tone="green" />
          )}
          {seesMoney && (
            <StatCard label="Today pending" value={rupees(pendingToday)} note="Unpaid from today's requests" href="/admin/requests" icon={Clock} tone="red" />
          )}
          {seesMoney && (
            <StatCard label="Today's business" value={rupees(businessToday)} note={`${todays.length} new request${todays.length === 1 ? "" : "s"} today`} icon={Briefcase} tone="blue" />
          )}
          {seesMoney && (
            <StatCard label="Collection rate" value={`${rateToday}%`} note="Paid share of today's business" icon={TrendingUp} tone="orange">
              <Rate rate={rateToday} />
            </StatCard>
          )}
          {!seesMoney && (
            <StatCard label={profile.role === "service_executive" ? "My open work" : "Open requests"} value={open.length} note="Click to view" href="/admin/requests" icon={ClipboardList} tone="blue" />
          )}
          {!seesMoney && <StatCard label="Completed today" value={completedToday ?? 0} note="Finished and handed over" icon={CircleCheck} tone="green" />}
        </div>
      </Section>

      {seesMoney && (
        <Section title="Overall business">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total received" value={rupees(receivedAll)} note="All-time collected" icon={IndianRupee} tone="green" />
            <StatCard label="Total pending" value={rupees(pendingAll)} note="Click to see requests" href="/admin/requests?status=all" icon={TriangleAlert} tone="red" />
            <StatCard label="Total business" value={rupees(businessAll)} note="All-time business value" icon={TrendingUp} tone="blue" />
            <StatCard label="Collection rate" value={`${rateAll}%`} note="Paid share of all business" icon={TrendingUp} tone="purple">
              <Rate rate={rateAll} />
            </StatCard>
          </div>
        </Section>
      )}

      <Section title="Center overview">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total customers" value={customers ?? 0} note="Click to manage" href="/admin/customers" icon={Users} tone="blue" />
          <StatCard label="Open requests" value={open.length} note="Click to view all" href="/admin/requests" icon={ClipboardList} tone="orange" />
          <StatCard label="Active services" value={services ?? 0} note="Click to manage" href="/admin/services" icon={Settings} tone="green" />
          <StatCard label="Overdue requests" value={overdue.length} note="Past expected time" href="#action-required" icon={TriangleAlert} tone="red" />
          {seesRetailers && (
            <StatCard label="Retailers awaiting approval" value={pendingRetailers} note="Click to review" href="/admin/retailers?status=pending" icon={Store} tone="purple" />
          )}
          <StatCard label="Completed today" value={completedToday ?? 0} note="Finished and handed over" icon={CircleCheck} tone="green" />
        </div>
      </Section>

      <Section title="Action required">
        <div id="action-required" className="rounded-xl border border-slate-100 bg-white shadow-sm">
          {action.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Nothing needs attention right now.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {action.map(({ r, why }) => (
                <li key={r.id}>
                  <Link href={`/admin/requests/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                    <span>
                      <span className="font-semibold text-blue-800">{r.request_number}</span>
                      <span className="text-slate-600"> · {r.customers?.full_name} · {r.services?.name_en}</span>
                    </span>
                    <span className="flex items-center gap-3 text-sm">
                      <span className="text-slate-500">{STATUS_LABEL[r.status]}</span>
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">{why}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  );
}
