import { requireStaff } from "@/lib/auth";
import { OPEN_STATUSES, ROLE_LABEL } from "@/lib/format";
import { AdminShell } from "@/components/admin-shell";
import { signOut } from "../login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireStaff();
  // Badge on the bell: open requests waiting for someone at OMSUN to act.
  const { count } = await supabase
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .in("status", OPEN_STATUSES.filter((s) => s !== "pending" && s !== "documents_required"));
  return (
    <AdminShell
      role={profile.role}
      name={profile.full_name || profile.email || "Staff"}
      roleLabel={ROLE_LABEL[profile.role]}
      attention={count ?? 0}
      signOut={signOut}
    >
      {children}
    </AdminShell>
  );
}
