"use client";

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
  ChevronLeft,
  LogOut,
  Search,
  Bell,
} from "lucide-react";
import { useShell } from "./shell-context";
import { signOut } from "@/app/login/actions";
import { LogoMark } from "@/components/logo";

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-1">
      <LogoMark className="h-8 w-8" />
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900">regtipass</span>
    </Link>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-emerald-600" : "text-zinc-400"}`} />
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

  const insideEvent = eventNav && pathname.includes(`/dashboard/events/${eventNav.eventId}`);

  const initials = (userEmail ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white px-3 py-4">
        <Logo />

        <nav className="mt-6 flex flex-1 flex-col">
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
                      ? "bg-emerald-100 text-emerald-700"
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
                />
                {eventNav.isOwner && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/form`}
                    label="Form"
                    icon={ListChecks}
                    active={pathname.endsWith("/form")}
                  />
                )}
                {eventNav.isOwner && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/templates`}
                    label="Templates"
                    icon={Palette}
                    active={pathname.includes("/templates")}
                  />
                )}
                {eventNav.canManageParticipants && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/issue`}
                    label="Issue tickets"
                    icon={Ticket}
                    active={pathname.endsWith("/issue")}
                  />
                )}
                {eventNav.canCheckin && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/checkin`}
                    label="Check-in"
                    icon={ScanLine}
                    active={pathname.endsWith("/checkin")}
                  />
                )}
                {eventNav.isOwner && (
                  <NavLink
                    href={`/dashboard/events/${eventNav.eventId}/staff`}
                    label="Staff"
                    icon={Users}
                    active={pathname.endsWith("/staff")}
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
                />
              </div>
            </>
          )}
        </nav>

        <form action={signOut}>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
            <LogOut className="h-4 w-4 text-zinc-400" />
            Sign out
          </button>
        </form>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6">
          <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-400 w-72">
            <Search className="h-4 w-4" />
            <span>Search…</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                {initials}
              </span>
              <span className="max-w-[160px] truncate text-sm font-medium text-zinc-700">
                {userEmail}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
