"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  ScanLine,
  Users,
  Wallet,
  LogOut,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useShell } from "./shell-context";
import { signOut } from "@/app/login/actions";
import { LogoMark } from "@/components/logo";
import { ProfileMenu } from "@/components/profile-menu";

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
  events,
}: {
  children: React.ReactNode;
  userEmail: string | null;
  events: { id: string; name: string; status: string }[];
}) {
  const pathname = usePathname();
  const { eventNav } = useShell();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  const insideEvent = eventNav && pathname.includes(`/dashboard/events/${eventNav.eventId}`);

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
                    label="Form & templates"
                    icon={ListChecks}
                    active={pathname.endsWith("/form") || pathname.includes("/templates")}
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
                    label="Ticket sales"
                    icon={Wallet}
                    active={pathname.endsWith("/sales") || pathname.endsWith("/issue")}
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
                  label="Overview"
                  icon={LayoutDashboard}
                  active={pathname === "/dashboard"}
                  onClick={closeMobile}
                />
              </div>

              {events.length > 0 && (
                <>
                  <SectionLabel>Events</SectionLabel>
                  <div className="flex flex-col gap-0.5">
                    {events.map((e) => {
                      const href = `/dashboard/events/${e.id}`;
                      const active = pathname.startsWith(href);
                      return (
                        <Link
                          key={e.id}
                          href={href}
                          onClick={closeMobile}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-orange-50 text-orange-700"
                              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              e.status === "active" ? "bg-orange-500" : "bg-zinc-300"
                            }`}
                          />
                          <span className="truncate">{e.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
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
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-1 shrink-0 items-center justify-end gap-2 sm:gap-4">
            <button className="hidden h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 sm:flex">
              <Bell className="h-4 w-4" />
            </button>
            <ProfileMenu email={userEmail} manageHref="/dashboard" manageLabel="All events" />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
