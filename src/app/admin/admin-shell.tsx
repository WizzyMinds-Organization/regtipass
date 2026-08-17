"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, X } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { LogoMark } from "@/components/logo";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Organizations", icon: Building2 },
];

export function AdminShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const initials = (userEmail ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white px-3 py-4 transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 px-1">
            <LogoMark className="h-8 w-8 shrink-0" />
            <span className="text-[15px] font-semibold tracking-tight text-zinc-900">regtipass</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 flex flex-1 flex-col">
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Platform
          </div>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-orange-50 text-orange-700"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-orange-600" : "text-zinc-400"}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mb-2 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
          <ShieldCheck className="h-4 w-4 shrink-0 text-zinc-400" />
          Super admin
        </div>

        <form action={signOut}>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
            <LogOut className="h-4 w-4 shrink-0 text-zinc-400" />
            Sign out
          </button>
        </form>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-400 sm:flex sm:w-56 lg:w-72">
              <Search className="h-4 w-4 shrink-0" />
              <span className="truncate">Search…</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="hidden max-w-[200px] truncate text-sm font-medium text-zinc-700 md:inline">
              {userEmail}
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
