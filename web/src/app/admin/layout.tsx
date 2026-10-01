import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import type { AppRole } from "@/lib/types";
import { signOut } from "../login/actions";

const NAV: { href: string; label: string; roles?: AppRole[] }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/requests", label: "Requests", roles: ["owner", "manager", "accountant", "sales_executive", "service_executive"] },
  { href: "/admin/requests/new", label: "New walk-in", roles: ["owner", "manager", "service_executive"] },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/retailers", label: "Retailers", roles: ["owner", "manager", "accountant", "sales_executive"] },
  { href: "/admin/payments", label: "Payments", roles: ["owner", "manager", "accountant"] },
  { href: "/admin/team", label: "Team", roles: ["owner", "manager"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();
  const links = NAV.filter((n) => !n.roles || n.roles.includes(profile.role));
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-blue-900 text-white md:w-60 md:shrink-0">
        <div className="px-5 py-4">
          <Link href="/admin" className="text-lg font-bold">
            OMSUN <span className="text-yellow-300">Admin</span>
          </Link>
          <p className="mt-1 text-xs text-blue-200">
            {profile.full_name || profile.email} · {ROLE_LABEL[profile.role]}
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {links.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-blue-800">
              {n.label}
            </Link>
          ))}
          <form action={signOut}>
            <button className="w-full whitespace-nowrap rounded-md px-3 py-2 text-left text-sm text-blue-200 hover:bg-blue-800">
              Sign out
            </button>
          </form>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
