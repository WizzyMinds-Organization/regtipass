"use client";

import { useActionState, useState } from "react";
import { createAccount } from "./actions";

const initialState: Awaited<ReturnType<typeof createAccount>> = {
  error: null,
  ownerPassword: undefined,
  ownerEmail: undefined,
};

export function NewAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createAccount, initialState);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-medium text-zinc-900"
      >
        {open ? "− Hide" : "+ New account"}
      </button>

      {open && (
        <form action={formAction} className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Organization name</label>
              <input
                name="name"
                required
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-600">Contact email (optional)</label>
              <input
                name="contact_email"
                type="email"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">Owner login email</label>
            <input
              name="owner_email"
              type="email"
              required
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          {state.ownerPassword && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              Account created. Share these credentials with the owner (shown once):
              <div className="mt-1 font-mono text-xs">
                {state.ownerEmail} / {state.ownerPassword}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create account"}
          </button>
        </form>
      )}
    </div>
  );
}
