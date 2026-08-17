"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  LayoutDashboard,
  ListChecks,
  Palette,
  Ticket,
  ScanLine,
  Users,
  Wallet,
  ChevronLeft,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useShell } from "./shell-context";
import { signOut } from "@/app/login/actions";
import { LogoMark } from "@/components/logo";

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-1">
      <LogoMark className="h-8 w-8 shrink-0" />
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">regtipass</span>
    </Link>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-orange-50 text-orange-700"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-orange-600" : "text-zinc-400"}`} />
      {label}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
      {children}
    </div>
  );
}

export function DashboardShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail: string | null;
}) {
  const pathname = usePathname();
  const { eventNav } = useShell();
  const [mobileOpen, setMobileOpen] = useState(false);

  const insideEvent = eventNav && pathname.includes(`/dashboard/events/${eventNav.eventId}`);
  const initials = (userEmail ?? "?").slice(0, 1).toUpperCase();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-zinc-200 bg-white px-3 py-4 transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Logo />
          <button
            onClick={closeMobile}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 flex flex-1 flex-col overflow-y-auto">
          {insideEvent ? (
            <>
              <Link
                href="/dashboard"
                className="mb-2 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                All events
              </Link>

              <div className="rounded-lg bg-zinc-50 px-3 py-2">
                <p className="truncate text-sm font-semibold text-zinc-900">{eventNav.eventName}</p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    eventNav.eventStatus === "active"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {eventNav.eventStatus}
                </span>
              </div>

              <SectionLabel>Event</SectionLabel>
              <div className="flex flex-col gap-0.5">
                <NavLink
                  href={`/dashboard/events/${eventNav.eventId}`}
                  label="Overview"
                  icon={LayoutDashboard}
                  active={pathname === `/dashboard/events/${eventNav.eventId}`}
                  onClick={closeMobile}
                />
                {eventNav.isOwner && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/form`}
                    label="Form"
                    icon={ListChecks}
                    active={pathname.endsWith("/form")}
                    onClick={closeMobile}
                  />
                )}
                {eventNav.isOwner && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/templates`}
                    label="Templates"
                    icon={Palette}
                    active={pathname.includes("/templates")}
                    onClick={closeMobile}
                  />
                )}
                {eventNav.canManageParticipants && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/issue`}
                    label="Issue tickets"
                    icon={Ticket}
                    active={pathname.endsWith("/issue")}
                    onClick={closeMobile}
                  />
                )}
                {eventNav.canCheckin && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/checkin`}
                    label="Check-in"
                    icon={ScanLine}
                    active={pathname.endsWith("/checkin")}
                    onClick={closeMobile}
                  />
                )}
                {eventNav.canManageParticipants && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/sales`}
                    label="Sales"
                    icon={Wallet}
                    active={pathname.endsWith("/sales")}
                    onClick={closeMobile}
                  />
                )}
                {eventNav.isOwner && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/staff`}
                    label="Staff"
                    icon={Users}
                    active={pathname.endsWith("/staff")}
                    onClick={closeMobile}
                  />
                )}
              </div>
            </>
          ) : (
            <>
              <SectionLabel>Menu</SectionLabel>
              <div className="flex flex-col gap-0.5">
                <NavLink
                  href="/dashboard"
                  label="Events"
                  icon={CalendarRange}
                  active={pathname === "/dashboard"}
                  onClick={closeMobile}
                />
              </div>
            </>
          )}
        </nav>

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

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <button className="hidden h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 sm:flex">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                {initials}
              </span>
              <span className="hidden max-w-[160px] truncate text-sm font-medium text-zinc-700 md:inline">
                {userEmail}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
