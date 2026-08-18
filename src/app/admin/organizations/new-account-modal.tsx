"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { createAccount } from "@/app/admin/actions";
import { PasswordInput } from "@/components/password-input";

const initialState: Awaited<ReturnType<typeof createAccount>> = {
  error: null,
  ownerEmail: undefined,
  created: false,
};

function NewAccountFormBody({ onDone }: { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createAccount, initialState);

  if (state.created) {
    return (
      <div className="mt-4 flex flex-col gap-3">
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Account created for {state.ownerEmail}.
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
        <label className="text-xs font-medium text-zinc-600">Organization name</label>
        <input
          name="name"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Owner name</label>
        <input
          name="owner_name"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Owner email</label>
        <input
          name="owner_email"
          type="email"
          required
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-orange-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-600">Owner password</label>
        <PasswordInput name="owner_password" required minLength={8} autoComplete="new-password" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 self-start rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create organization"}
      </button>
    </form>
  );
}

export function NewAccountModal() {
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
        New organization
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={close} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">New organization</h2>
              <button
                onClick={close}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <NewAccountFormBody key={formKey} onDone={close} />
          </div>
        </div>
      )}
    </>
  );
}
