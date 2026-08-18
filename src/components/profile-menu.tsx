"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, KeyRound, LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";

export function ProfileMenu({
  email,
  manageHref,
  manageLabel,
}: {
  email: string | null;
  manageHref: string;
  manageLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const initials = (email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white"
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
            <div className="border-b border-zinc-100 px-4 py-3">
              <p className="truncate text-sm font-medium text-zinc-900">{email}</p>
            </div>
            <div className="flex flex-col py-1">
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <KeyRound className="h-4 w-4 shrink-0 text-zinc-400" />
                Change password
              </Link>
              <Link
                href={manageHref}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                <CalendarRange className="h-4 w-4 shrink-0 text-zinc-400" />
                {manageLabel}
              </Link>
            </div>
            <form action={signOut} className="border-t border-zinc-100 py-1">
              <button className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                <LogOut className="h-4 w-4 shrink-0 text-zinc-400" />
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
