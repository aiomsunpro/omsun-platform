import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { AppRole, Profile } from "./types";

export const STAFF_ROLES: AppRole[] = [
  "owner",
  "manager",
  "accountant",
  "sales_executive",
  "service_executive",
];

// The signed-in staff member, or a redirect. Use in every admin page and action.
export async function requireStaff(allowed: AppRole[] = STAFF_ROLES) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, mobile, email, role, is_active")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || !profile.is_active || !STAFF_ROLES.includes(profile.role)) {
    redirect("/login?error=not-staff");
  }
  if (!allowed.includes(profile.role)) redirect("/admin");
  return { supabase, profile };
}

export function can(profile: Profile, ...roles: AppRole[]) {
  return roles.includes(profile.role);
}
