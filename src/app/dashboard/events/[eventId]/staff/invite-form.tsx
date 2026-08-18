"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { StaffRole } from "@/lib/supabase/types";
import { inviteStaff } from "./actions";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "./roles";
import { PasswordInput } from "@/components/password-input";

const ROLE_ORDER: StaffRole[] = ["manager", "issuer", "checkin"];

function InviteStaffFormBody({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const action = inviteStaff.bind(null, eventId);
  const initialState: Awaited<ReturnType<typeof action>> = {
    error: null,
    email: undefined,
    invited: false,
  };
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.invited) {
    return (
      <div className="mt-4 flex flex-col gap-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {state.email} invited.
        </div>
        <button
          onClick={onDone}
          className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Name</label>
        <input
          name="name"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Email</label>
        <input
          name="email"
          type="email"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Password</label>
        <PasswordInput name="password" minLength={8} autoComplete="new-password" />
        <p className="text-[11px] text-zinc-400">Only used if this email doesn&apos;t already have an account.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-zinc-600">Role</label>
        {ROLE_ORDER.map((role, i) => (
          <label
            key={role}
            className="flex items-start gap-2.5 rounded-md border border-zinc-200 p-2.5 text-sm text-zinc-700 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50"
          >
            <input name="role" type="radio" value={role} defaultChecked={i === 0} className="mt-0.5" />
            <span>
              <span className="font-medium text-zinc-900">{ROLE_LABELS[role]}</span>
              <span className="block text-xs text-zinc-500">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </label>
        ))}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {pending ? "Inviting..." : "Invite"}
      </button>
    </form>
  );
}

export function InviteStaffForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setFormKey((k) => k + 1);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
      >
        <Plus className="h-4 w-4" />
        Invite staff
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Invite staff</h2>
              <button
                onClick={close}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <InviteStaffFormBody key={formKey} eventId={eventId} onDone={close} />
          </div>
        </div>
      )}
    </>
  );
}
