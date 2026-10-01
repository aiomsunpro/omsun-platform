"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CirclePlus,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Store,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/types";

type NavItem = { href: string; label: string; icon: LucideIcon; roles?: AppRole[] };

const ALL_STAFF: AppRole[] = ["owner", "manager", "accountant", "sales_executive", "service_executive"];

const GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "Main", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    title: "Service",
    items: [
      { href: "/admin/requests", label: "Service Requests", icon: ClipboardList, roles: ALL_STAFF },
      { href: "/admin/requests/new", label: "New Walk-in", icon: CirclePlus, roles: ["owner", "manager", "service_executive"] },
      { href: "/admin/services", label: "Service Management", icon: Settings },
    ],
  },
  {
    title: "Customer",
    items: [{ href: "/admin/customers", label: "Customer Management", icon: Users }],
  },
  {
    title: "Retailers",
    items: [{ href: "/admin/retailers", label: "OMSUN Mitra Retailers", icon: Store, roles: ["owner", "manager", "accountant", "sales_executive"] }],
  },
  {
    title: "Accounts",
    items: [{ href: "/admin/payments", label: "Payments", icon: Wallet, roles: ["owner", "manager", "accountant"] }],
  },
  {
    title: "Admin",
    items: [{ href: "/admin/team", label: "Team & Roles", icon: UserCog, roles: ["owner", "manager"] }],
  },
];

export function AdminShell({
  role,
  name,
  roleLabel,
  attention,
  signOut,
  children,
}: {
  role: AppRole;
  name: string;
  roleLabel: string;
  attention: number;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
  const canWalkIn = ["owner", "manager", "service_executive"].includes(role);

  // The most specific menu entry that matches the current page is highlighted.
  const activeHref = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || (h !== "/admin" && pathname.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-gradient-to-r from-blue-950 via-blue-800 to-blue-600 px-3 text-white shadow md:px-4">
        <Link href="/admin" className="flex w-auto items-center gap-2 md:w-60">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-blue-950">OM</span>
          <span className="hidden text-lg font-bold sm:inline">
            OMSUN <span className="text-yellow-300">Admin</span>
          </span>
        </Link>
        <button
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-white/40 p-2 hover:bg-white/10 md:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          {canWalkIn && (
            <Link href="/admin/requests/new" title="New walk-in" className="rounded-md bg-green-600 p-2 hover:bg-green-500">
              <CirclePlus size={18} />
            </Link>
          )}
          <Link href="/admin/requests" title="Service requests" className="rounded-md bg-white/15 p-2 hover:bg-white/25">
            <ClipboardList size={18} />
          </Link>
          {["owner", "manager", "accountant"].includes(role) && (
            <Link href="/admin/payments" title="Payments" className="rounded-md bg-yellow-400 p-2 text-blue-950 hover:bg-yellow-300">
              <Wallet size={18} />
            </Link>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/admin#action-required" title="Needs attention" className="relative rounded-full p-2 hover:bg-white/10">
            <Bell size={20} />
            {attention > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-500 px-1 text-center text-xs font-bold">
                {attention}
              </span>
            )}
          </Link>
          <div className="hidden text-right text-xs leading-tight sm:block">
            <p className="font-semibold">{name}</p>
            <p className="text-blue-200">{roleLabel}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-900">
            {name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="md:w-60 md:shrink-0 md:bg-blue-950">
          <aside
            className={`${open ? "block" : "hidden"} fixed inset-y-16 left-0 z-20 w-64 overflow-y-auto bg-blue-950 text-blue-50 md:sticky md:top-16 md:block md:h-[calc(100vh-4rem)] md:w-60`}
          >
            <nav className="py-4">
              {groups.map((g) => (
                <div key={g.title} className="mb-2 border-b border-white/10 pb-2">
                  <p className="px-6 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-blue-300/70">{g.title}</p>
                  {g.items.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      onClick={() => setOpen(false)}
                      className={`mx-3 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold ${
                        isActive(i.href) ? "bg-yellow-400 text-blue-950" : "hover:bg-white/10"
                      }`}
                    >
                      <i.icon size={18} />
                      {i.label}
                    </Link>
                  ))}
                </div>
              ))}
              <form action={signOut}>
                <button className="mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-blue-200 hover:bg-white/10">
                  <LogOut size={18} /> Sign out
                </button>
              </form>
            </nav>
          </aside>
        </div>
        {open && <div className="fixed inset-0 top-16 z-10 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 p-4 md:p-8">{children}</main>
          <footer className="flex flex-wrap items-center justify-between gap-2 bg-blue-900 px-6 py-3 text-xs text-blue-100">
            <span className="font-semibold">OMSUN E-Services · All Digital Services Under One Roof</span>
            <span>© {new Date().getFullYear()} OMSUN E-Services, Omerga</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
