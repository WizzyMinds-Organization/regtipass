"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, Check, KeyRound, LogOut, Pencil, X } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { updateOwnName } from "@/app/profile-actions";
import { useToast } from "@/components/toast";

export function ProfileMenu({
  name,
  email,
  manageHref,
  manageLabel,
}: {
  name: string | null;
  email: string | null;
  manageHref: string;
  manageLabel: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(name ?? "");
  const [draft, setDraft] = useState(name ?? "");
  const [saving, setSaving] = useState(false);
  const initials = (nameValue || email || "?").slice(0, 1).toUpperCase();

  async function saveName() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === nameValue) {
      setEditing(false);
      setDraft(nameValue);
      return;
    }
    setSaving(true);
    const res = await updateOwnName(trimmed);
    setSaving(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setNameValue(trimmed);
    setEditing(false);
    toast.success("Name updated.");
  }

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
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName();
                      if (e.key === "Escape") {
                        setEditing(false);
                        setDraft(nameValue);
                      }
                    }}
                    disabled={saving}
                    className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1 text-sm text-zinc-900 outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={saveName}
                    disabled={saving}
                    className="rounded-md p-1 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                    title="Save"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setDraft(nameValue);
                    }}
                    disabled={saving}
                    className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1.5">
                  <p className="truncate text-sm font-medium text-zinc-900">{nameValue || email}</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    title="Edit name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {nameValue && <p className="mt-0.5 truncate text-xs text-zinc-500">{email}</p>}
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
