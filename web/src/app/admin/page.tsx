import Link from "next/link";
import { can, requireStaff } from "@/lib/auth";
import { OPEN_STATUSES, rupees, STATUS_LABEL } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";
import { Card, PageTitle } from "@/components/ui";

function todayIST() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-blue-950">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function Dashboard() {
  const { supabase, profile } = await requireStaff();
  const today = todayIST();
  const seesMoney = can(profile, "owner", "manager", "accountant");

  // Visible requests are already limited by row-level security (a service executive sees only theirs).
  const { data: open } = await supabase
    .from("service_requests")
    .select("status")
    .in("status", OPEN_STATUSES);
  const byStatus = new Map<RequestStatus, number>();
  (open ?? []).forEach((r) => byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1));

  const { count: completedToday } = await supabase
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .gte("completed_at", `${today}T00:00:00+05:30`);

  let collectedToday = 0;
  let unverified = 0;
  let commissionPayable = 0;
  let pendingRetailers = 0;
  let activeRetailers = 0;
  if (seesMoney) {
    const { data: pays } = await supabase
      .from("payments")
      .select("amount, status")
      .eq("paid_on", today)
      .neq("status", "reversed");
    collectedToday = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "recorded");
    unverified = count ?? 0;
    const { data: comm } = await supabase.from("commissions").select("amount").eq("status", "earned");
    commissionPayable = (comm ?? []).reduce((s, c) => s + Number(c.amount), 0);
  }
  if (can(profile, "owner", "manager", "accountant", "sales_executive")) {
    const { count: p } = await supabase.from("retailers").select("id", { count: "exact", head: true }).eq("status", "pending");
    const { count: a } = await supabase.from("retailers").select("id", { count: "exact", head: true }).eq("status", "approved");
    pendingRetailers = p ?? 0;
    activeRetailers = a ?? 0;
  }

  return (
    <>
      <PageTitle title={`Namaste, ${profile.full_name?.split(" ")[0] || "team"}`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={profile.role === "service_executive" ? "My open work" : "Open requests"} value={open?.length ?? 0} href="/admin/requests" />
        <Stat label="Completed today" value={completedToday ?? 0} />
        {seesMoney && <Stat label="Collected today" value={rupees(collectedToday)} href="/admin/payments" />}
        {seesMoney && <Stat label="Payments to verify" value={unverified} href="/admin/payments?status=recorded" />}
        {seesMoney && <Stat label="Commission earned, unsettled" value={rupees(commissionPayable)} />}
        {pendingRetailers + activeRetailers > 0 && (
          <>
            <Stat label="Active retailers" value={activeRetailers} href="/admin/retailers?status=approved" />
            <Stat label="Retailers awaiting approval" value={pendingRetailers} href="/admin/retailers?status=pending" />
          </>
        )}
      </div>

      <div className="mt-8">
        <Card title="Open requests by status">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {OPEN_STATUSES.map((s) => (
              <li key={s}>
                <Link href={`/admin/requests?status=${s}`} className="flex justify-between rounded-md bg-blue-50 px-3 py-2 text-sm hover:bg-blue-100">
                  <span>{STATUS_LABEL[s]}</span>
                  <span className="font-semibold">{byStatus.get(s) ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
